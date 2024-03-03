import jwt from 'jsonwebtoken'
import { dayjs } from '../utils/dayjs';
import { FilterException } from '../utils/exceptions';

/**
 * Handle possible date filtering options in the query parameters for getTransactionsByUser when called by a Regular user.
 * @param req the request object that can contain query parameters
 * @returns an object that can be used for filtering MongoDB queries according to the `date` parameter.
 *  The returned object must handle all possible combination of date filtering parameters, including the case where none are present.
 *  Example: {date: {$gte: "2023-04-30T00:00:00.000Z"}} returns all transactions whose `date` parameter indicates a date from 30/04/2023 (included) onwards
 * @throws an error if the query parameters include `date` together with at least one of `from` or `upTo`
 */
export const handleDateFilterParams = (req) => {
    // - `from`. Specifies the starting date from which transactions must be retrieved.
    // - `upTo`. Specifies the final date up to which transactions must be retrieved.
    // - `date`. Specifies the date in which transactions must be retrieved.
    const { date, from, upTo } = req.query;
    const filter = {}

    if ([date, from, upTo].some(value => typeof value !== 'undefined' && !dayjs.utc(value, 'YYYY-MM-DD', true).isValid()))
        throw new FilterException('Invalid date in one of query params');

    if (date) {
        if (from || upTo)
            throw new FilterException('Cannot specify "date" together with "from" or "upTo"');

        const minDate = dayjs.utc(date, 'YYYY-MM-DD', true).startOf('day');
        const maxDate = dayjs.utc(date, 'YYYY-MM-DD', true).endOf('day');

        filter['$gte'] = minDate.toDate();
        filter['$lte'] = maxDate.toDate();
    } else {
        if (from) {
            filter['$gte'] = dayjs.utc(from, 'YYYY-MM-DD', true).startOf('day').toDate();
        }
        if (upTo) {
            filter['$lte'] = dayjs.utc(upTo, 'YYYY-MM-DD', true).endOf('day').toDate();
        }
    }

    return Object.keys(filter).length ? {
        date: filter
    } : {}
}

/**
 * Handle possible amount filtering options in the query parameters for getTransactionsByUser when called by a Regular user.
 * @param req the request object that can contain query parameters
 * @returns an object that can be used for filtering MongoDB queries according to the `amount` parameter.
 *  The returned object must handle all possible combination of amount filtering parameters, including the case where none are present.
 *  Example: {amount: {$gte: 100}} returns all transactions whose `amount` parameter is greater or equal than 100
 */
export const handleAmountFilterParams = (req) => {
    // - `min`. Specifies the minimum amount that transactions must have to be retrieved.
    // - `max`. Specifies the maximum amount that transactions must have to be retrieved.
    const { min, max } = req.query;

    // validation
    if ([min, max].some(value => typeof value !== 'undefined' && Number.isNaN(parseFloat(value))))
        throw new FilterException('Invalid values in one of query params');

    const filter = {}

    if (min) {
        filter['$gte'] = parseFloat(min);
    }
    if (max) {
        filter['$lte'] = parseFloat(max);
    }

    return Object.keys(filter).length ? {
        amount: filter
    } : {}
}

/**
 * Handle possible authentication modes depending on `authType`
 * @param req the request object that contains cookie information
 * @param res the result object of the request
 * @param info an object that specifies the `authType` and that contains additional information, depending on the value of `authType`
 *      Example: {authType: "Simple"}
 *      Additional criteria:
 *          - authType === "User":
 *              - either the accessToken or the refreshToken have a `username` different from the requested one => error 401
 *              - the accessToken is expired and the refreshToken has a `username` different from the requested one => error 401
 *              - both the accessToken and the refreshToken have a `username` equal to the requested one => success
 *              - the accessToken is expired and the refreshToken has a `username` equal to the requested one => success
 *          - authType === "Admin":
 *              - either the accessToken or the refreshToken have a `role` which is not Admin => error 401
 *              - the accessToken is expired and the refreshToken has a `role` which is not Admin => error 401
 *              - both the accessToken and the refreshToken have a `role` which is equal to Admin => success
 *              - the accessToken is expired and the refreshToken has a `role` which is equal to Admin => success
 *          - authType === "Group":
 *              - **additional param: "groupId" or "group" (full group doc)**
 *              - either the accessToken or the refreshToken have a `email` which is not in the requested group => error 401
 *              - the accessToken is expired and the refreshToken has a `email` which is not in the requested group => error 401
 *              - both the accessToken and the refreshToken have a `email` which is in the requested group => success
 *              - the accessToken is expired and the refreshToken has a `email` which is in the requested group => success
 * @returns true if the user satisfies all the conditions of the specified `authType` and false if at least one condition is not satisfied
 *  Refreshes the accessToken if it has expired and the refreshToken is still valid
 */
export const verifyAuth = (req, res, info) => {
    const cookie = req.cookies
    if (!cookie.accessToken || !cookie.refreshToken) {
        return { authorized: false, cause: "Unauthorized" };
    }

    try {
        const decodedAccessToken = jwt.verify(cookie.accessToken, process.env.ACCESS_KEY);
        const decodedRefreshToken = jwt.verify(cookie.refreshToken, process.env.ACCESS_KEY);
        if (!decodedAccessToken.username || !decodedAccessToken.email || !decodedAccessToken.role) {
            return { authorized: false, cause: "Token is missing information" }
        }
        if (!decodedRefreshToken.username || !decodedRefreshToken.email || !decodedRefreshToken.role) {
            return { authorized: false, cause: "Token is missing information" }
        }
        if (decodedAccessToken.username !== decodedRefreshToken.username || decodedAccessToken.email !== decodedRefreshToken.email || decodedAccessToken.role !== decodedRefreshToken.role) {
            return { authorized: false, cause: "Mismatched users" };
        }

        if (info.authType === 'Admin' && (decodedAccessToken.role !== info.authType || decodedRefreshToken.role !== info.authType)) {
            return { authorized: false, cause: "Mismatched role" };
        }

        if (info.authType === 'User' && (decodedAccessToken.username !== info.username || decodedRefreshToken.username !== info.username)) {
            return { authorized: false, cause: "Mismatched username" };
        }

        if (info.authType === 'Group') {
            const { emails } = info;
            if (!emails.includes(decodedAccessToken.email)) {
                return { authorized: false, cause: 'User is not a group member' }
            }
        }

        return { authorized: true, cause: "Authorized" }
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            try {
                const refreshToken = jwt.verify(cookie.refreshToken, process.env.ACCESS_KEY)
                const newAccessToken = jwt.sign({
                    username: refreshToken.username,
                    email: refreshToken.email,
                    id: refreshToken.id,
                    role: refreshToken.role
                }, process.env.ACCESS_KEY, { expiresIn: '1h' })
                res.cookie('accessToken', newAccessToken, { httpOnly: true, path: '/api', maxAge: 60 * 60 * 1000, sameSite: 'none', secure: true })
                res.locals.refreshedTokenMessage = 'Access token has been refreshed. Remember to copy the new one in the headers of subsequent calls'
                return { authorized: true, cause: "Authorized" }
            } catch (err) {
                if (err.name === "TokenExpiredError") {
                    return { authorized: false, cause: "Perform login again" }
                }

                return { authorized: false, cause: err.name };
            }
        } else {
            return { authorized: false, cause: err.name };
        }
    }
}

