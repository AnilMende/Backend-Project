
const asyncHandler = (requestHandler) => {
   return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}
export { asyncHandler };

// example
// app.get('/user', asyncHandler(async (req, res) => {
//     const user = await getUser();
//     res.send(user)
// }))
// Now, By wrapping the async route with asyncHandler
// the Promise returned by the async function is captured.
// If the Promise rejects, the error is caught in .catch() and passed to Express.
// Without this wrapper, Express cannot catch async errors, 
// leading to unhandled promise rejections and potential server crashes.

// syncErros express can catch
// AsyncErrors - Express can not catch unless you wrap it
// asyncHandler - the wrapper that catches all async errors

// const asyncHandler = () => {}
// const asyncHadler = (func) => () => {}
// const asyncHandler = (func) => async () => {}