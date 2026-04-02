using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DumpAnalyzerApi.Logger
{
    public class ConsoleLogger : ILogger
    {
        private readonly string _categoryName;
        private readonly bool _isEnabled;

        public ConsoleLogger(string categoryName, bool isEnabled)
        {
            _categoryName = categoryName;
            _isEnabled = isEnabled;
        }

        public IDisposable BeginScope<TState>(TState state)
        {
            // No scope support for simplicity
            return null!;
        }

        public bool IsEnabled(LogLevel logLevel)
        {
            // Log everything for demo purposes
            return logLevel != LogLevel.None && _isEnabled;
        }

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (!IsEnabled(logLevel))
                return;

            string message = formatter(state, exception);
            if (exception != null)
            {
                message += $" Exception: {exception}";
            }

            Console.WriteLine($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] [{logLevel}] {_categoryName}: {message}");
        }
    }

    // Optional ILoggerProvider implementation
    public class ConsoleLoggerProvider : ILoggerProvider
    {
        public bool IsEnabled = true;
        public ILogger CreateLogger(string categoryName)
        {
            var logger = new ConsoleLogger(categoryName, IsEnabled);
            return logger;
        }

        public void Dispose()
        {
            // Nothing to dispose
        }
    }
}