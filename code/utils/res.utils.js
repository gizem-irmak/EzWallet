export const respondError = (res, status, message) => {
  res.locals.message = message;
  // if (status === 500) console.error(message)

  return res.status(status).json({ error: message })
}

export const respondData = (res, data, status = 200) => {
  const response = { data };
  if (res.locals && res.locals.refreshedTokenMessage) {
    response.refreshedTokenMessage = res.locals.refreshedTokenMessage;
  }

  return res.status(status).json(response);
}