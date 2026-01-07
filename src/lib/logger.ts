type LogLevel = "info" | "warn" | "error";
type LogContextValue = string | number | boolean | null | undefined;
type LogContext = Record<string, LogContextValue>;

const formatError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
};

const buildLogEntry = (level: LogLevel, message: string, context?: LogContext) => {
  const entry: Record<string, LogContextValue> & {
    level: LogLevel;
    message: string;
    time: string;
  } = {
    level,
    message,
    time: new Date().toISOString(),
  };

  if (context) {
    for (const [key, value] of Object.entries(context)) {
      if (typeof value !== "undefined") {
        entry[key] = value;
      }
    }
  }

  return entry;
};

const writeLog = (level: LogLevel, message: string, context?: LogContext) => {
  const entry = buildLogEntry(level, message, context);
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.info(line);
};

export const logger = {
  info: (message: string, context?: LogContext) => writeLog("info", message, context),
  warn: (message: string, context?: LogContext) => writeLog("warn", message, context),
  error: (message: string, context?: LogContext) => writeLog("error", message, context),
  formatError,
};
