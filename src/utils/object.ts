import * as _ from 'lodash';

export const checkIfPartial = (obj1: object, obj2: object): boolean => {
	const keys = _.keys(obj1);

	for(const key of keys) {
		if (obj1[key] !== obj2[key]) {
			return false;
		}
	}

	return true;
}