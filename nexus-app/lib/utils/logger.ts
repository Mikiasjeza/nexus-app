// Structured logging utility

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  data?: any
  error?: Error
}

class Logger {
  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, data, error } = entry
    let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`
    
    if (data) {
      logMessage += ` ${JSON.stringify(data)}`
    }
    
    if (error) {
      logMessage += `\nError: ${error.message}\nStack: ${error.stack}`
    }
    
    return logMessage
  }

  private log(level: LogLevel, message: string, data?: any, error?: Error) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
      error,
    }

    const formatted = this.formatMessage(entry)

    switch (level) {
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(formatted)
        }
        break
      case 'info':
        console.info(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
        console.error(formatted)
        if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
          try {
            const { reportError } = require('@/lib/error-tracking')
            if (reportError && error) reportError(error)
          } catch {
            // Error tracking not configured
          }
        }
        break
    }
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data)
  }

  info(message: string, data?: any) {
    this.log('info', message, data)
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data)
  }

  error(message: string, error?: Error, data?: any) {
    this.log('error', message, data, error)
  }
}

export const logger = new Logger()
