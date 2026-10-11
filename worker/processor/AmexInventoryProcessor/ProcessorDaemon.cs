using System.Diagnostics;
using System.Net;
using System.Text;
using System.Text.Json;

internal sealed record ProcessorProcessRequest(
    string? InventoryPath,
    string[]? SourcePaths,
    string? OutputPath,
    string? UnmatchedCsvPath);

internal sealed record ProcessorWarmupRequest(string[]? SourcePaths);

internal sealed record ProcessorWarmupResult(
    int TotalWrs,
    long SourceRows,
    long ElapsedMs);

internal sealed record ProcessorHealth(
    bool IsWarm,
    int TotalWrs,
    long TotalSourceRows,
    DateTime LastWarmup);

/// <summary>
/// HTTP daemon boundary for the inventory processor. File parsing and workbook
/// transformation remain in Program; transport, request context and lifecycle
/// are isolated here so they can evolve independently.
/// </summary>
internal sealed class ProcessorDaemon
{
    private static readonly string[] DefaultSources = [
        "/app/cache/tib-active/delivered.xlsx",
        "/app/cache/tib-active/sent.xlsx",
        "/app/cache/tib-active/received.xlsx"
    ];

    private readonly JsonSerializerOptions _jsonOptions;
    private readonly Func<string[], Action<string, string>?, ProcessorWarmupResult> _warmup;
    private readonly Func<ProcessorProcessRequest, object> _process;
    private readonly Func<ProcessorHealth> _health;

    public ProcessorDaemon(
        JsonSerializerOptions jsonOptions,
        Func<string[], Action<string, string>?, ProcessorWarmupResult> warmup,
        Func<ProcessorProcessRequest, object> process,
        Func<ProcessorHealth> health)
    {
        _jsonOptions = jsonOptions;
        _warmup = warmup;
        _process = process;
        _health = health;
    }

    public void Run(int port)
    {
        string prefix = $"http://127.0.0.1:{port}/";
        using var listener = new HttpListener();
        listener.Prefixes.Add(prefix);
        listener.Start();
        Console.WriteLine($"[daemon] AmexInventoryProcessor Daemon escuchando en {prefix}");

        if (DefaultSources.Any(File.Exists))
        {
            _ = Task.Run(() =>
            {
                try
                {
                    Console.WriteLine("[daemon-boot] Iniciando precalentamiento automático de fuentes...");
                    var sw = Stopwatch.StartNew();
                    ProcessorWarmupResult result = _warmup(
                        DefaultSources.Where(File.Exists).ToArray(),
                        (stage, message) => Console.WriteLine($"[daemon-warmup] {stage}: {message}"));
                    Console.WriteLine($"[daemon-boot] Precalentamiento completado en {sw.ElapsedMilliseconds}ms. {result.TotalWrs:N0} WRs listos en RAM.");
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[daemon-boot-error] {ex.Message}");
                }
            });
        }

        while (listener.IsListening)
        {
            try
            {
                HttpListenerContext context = listener.GetContext();
                ThreadPool.QueueUserWorkItem(_ => HandleRequest(context));
            }
            catch (Exception) when (!listener.IsListening)
            {
                break;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[daemon-error] {ex.Message}");
            }
        }
    }

    private void HandleRequest(HttpListenerContext context)
    {
        HttpListenerRequest request = context.Request;
        HttpListenerResponse response = context.Response;
        string requestId = request.Headers["x-request-id"] ?? Guid.NewGuid().ToString("N");
        string correlationId = request.Headers["x-correlation-id"] ?? requestId;
        response.Headers["Access-Control-Allow-Origin"] = "*";
        response.Headers["Access-Control-Allow-Headers"] = "Content-Type, x-request-id, x-correlation-id";
        response.Headers["x-request-id"] = requestId;
        response.Headers["x-correlation-id"] = correlationId;
        LogRequest("request_received", requestId, correlationId, request.HttpMethod, request.Url?.AbsolutePath ?? "/");

        try
        {
            if (request.HttpMethod == "OPTIONS")
            {
                response.StatusCode = 204;
                response.Close();
                return;
            }

            string path = request.Url?.AbsolutePath ?? "/";
            if (request.HttpMethod == "GET" && path == "/health")
            {
                ProcessorHealth health = _health();
                SendJson(response, 200, new
                {
                    ok = true,
                    status = "daemon_online",
                    isWarm = health.IsWarm,
                    totalWrs = health.TotalWrs,
                    totalSourceRows = health.TotalSourceRows,
                    lastWarmup = health.LastWarmup,
                });
                return;
            }

            if (request.HttpMethod == "POST" && path == "/warmup")
            {
                using var reader = new StreamReader(request.InputStream, Encoding.UTF8);
                string body = reader.ReadToEnd();
                ProcessorWarmupRequest? parsed = string.IsNullOrWhiteSpace(body)
                    ? null
                    : JsonSerializer.Deserialize<ProcessorWarmupRequest>(body, _jsonOptions);
                string[] sources = parsed?.SourcePaths ?? DefaultSources;
                ProcessorWarmupResult result = _warmup(sources.Where(File.Exists).ToArray(), null);
                SendJson(response, 200, new
                {
                    ok = true,
                    status = "warm",
                    totalWrs = result.TotalWrs,
                    sourceRows = result.SourceRows,
                    elapsedMs = result.ElapsedMs,
                });
                return;
            }

            if (request.HttpMethod == "POST" && path == "/process")
            {
                using var reader = new StreamReader(request.InputStream, Encoding.UTF8);
                string body = reader.ReadToEnd();
                ProcessorProcessRequest processRequest = JsonSerializer.Deserialize<ProcessorProcessRequest>(body, _jsonOptions)
                    ?? throw new InvalidOperationException("Cuerpo de petición inválido.");
                if (string.IsNullOrWhiteSpace(processRequest.InventoryPath) || string.IsNullOrWhiteSpace(processRequest.OutputPath))
                    throw new InvalidOperationException("InventoryPath y OutputPath son requeridos.");

                object result = _process(processRequest);
                SendJson(response, 200, result);
                return;
            }

            SendJson(response, 404, new { ok = false, error = "Ruta no encontrada" });
        }
        catch (Exception ex)
        {
            LogRequest("request_failed", requestId, correlationId, request.HttpMethod, request.Url?.AbsolutePath ?? "/", ex.Message);
            SendJson(response, 500, new { ok = false, error = ex.Message });
        }
    }

    private void LogRequest(
        string eventName,
        string requestId,
        string correlationId,
        string method,
        string path,
        string? error = null)
    {
        Console.Error.WriteLine(JsonSerializer.Serialize(new
        {
            eventName,
            requestId,
            correlationId,
            method,
            path,
            error,
            timestamp = DateTimeOffset.UtcNow,
        }, _jsonOptions));
        Console.Error.Flush();
    }

    private void SendJson(HttpListenerResponse response, int statusCode, object data)
    {
        try
        {
            byte[] bytes = JsonSerializer.SerializeToUtf8Bytes(data, _jsonOptions);
            response.StatusCode = statusCode;
            response.ContentType = "application/json; charset=utf-8";
            response.ContentLength64 = bytes.Length;
            using Stream output = response.OutputStream;
            output.Write(bytes, 0, bytes.Length);
        }
        catch { }
        finally
        {
            try { response.Close(); } catch { }
        }
    }
}
