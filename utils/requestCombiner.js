const requestCombiner = (req) => {
  const { body, params, query } = req;
  return { ...body, ...params, ...query };
};

module.exports = requestCombiner;
