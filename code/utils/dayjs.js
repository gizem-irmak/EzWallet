import _dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import utc from 'dayjs/plugin/utc';

_dayjs.extend(utc);
_dayjs.extend(customParseFormat);
_dayjs.extend(isSameOrAfter);
_dayjs.extend(isSameOrBefore);

export const dayjs = _dayjs;
