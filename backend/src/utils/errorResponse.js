/**
 * Maps an error to the HTTP status it deserves.
 *
 * Bad client input is a 4xx. Returning 500 for a missing required field tells
 * the caller "the server broke" when the truth is "your request was wrong",
 * and it hides genuine faults in the noise.
 */
export const httpStatusForError = (err) => {
    if (!err) return 500;
    if (err.name === 'ValidationError') return 400;   // mongoose: required/enum/min…
    if (err.name === 'CastError') return 400;         // malformed ObjectId etc.
    if (err.code === 11000) return 409;               // duplicate key
    if (err.name === 'StrictModeError') return 400;

    // A third-party API that rejected us is an upstream failure, not our fault.
    // Reporting it as 500 makes our own error rate unreadable.
    if (err.isAxiosError || err.response?.status) return 502;

    return 500;
};

/**
 * Send an error response with an appropriate status.
 * `message` is the human-facing summary; the raw error text is included for
 * diagnostics, matching the existing controller convention.
 */
export const sendError = (res, err, message) =>
    res.status(httpStatusForError(err)).json({
        message,
        error: err?.message
    });
