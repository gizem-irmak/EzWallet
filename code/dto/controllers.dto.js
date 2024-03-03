import { checkSchema, param, body } from 'express-validator'

export const validationFailed = async (req, res, validators) => {
  for (const validator of validators) {
    const result = await validator.run(req);

    /* istanbul ignore if */
    if (Array.isArray(result)) {
      if (result.some(r => !r.isEmpty())) return true;
    } else if (!result.isEmpty()) return true;
  }

  return false;
}

const isGoodFloat = (value) => !Number.isNaN(+value)

const makeValidator = (...validators) => [...validators];

const notEmptyString = { isString: true, notEmpty: true, trim: true };
const makeNotEmptyString = v => v.isString().trim().notEmpty();

export const createCategoryDto = makeValidator(checkSchema({
  type: { ...notEmptyString },
  color: { ...notEmptyString },
}, ['body']))

export const updateCategoryDto = makeValidator(
  makeNotEmptyString(body('type')),
  makeNotEmptyString(body('color')),
  makeNotEmptyString(param('type')),
);

export const createTransactionDto = makeValidator(
  makeNotEmptyString(body('username')),
  makeNotEmptyString(body('type')),
  body('amount').isFloat().custom(isGoodFloat)
);

export const deleteTransactionDto = makeValidator(
  makeNotEmptyString(body('_id')),
);

export const deleteCategoriesDto = makeValidator(
  body('types').isArray({ min: 1 }),
  makeNotEmptyString(body('types.*')),
);

export const deleteTransactionsDto = makeValidator(
  body('_ids').isArray(),
  makeNotEmptyString(body('_ids.*')),
);

export const registerDto = makeValidator(
  makeNotEmptyString(body('username')),
  makeNotEmptyString(body('password')),
  body('email').isString().trim().notEmpty().isEmail(),
);

export const loginDto = makeValidator(
  makeNotEmptyString(body('password')),
  body('email').isString().trim().notEmpty().isEmail(),
);

