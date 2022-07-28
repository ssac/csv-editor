import * as path from 'path';
import * as fs from 'fs';
import {
	parse
} from 'csv-parse/sync';

import Helper from '../index';

function getContent (filePath: string) {
	return parse(fs.readFileSync(filePath), {
		bom: true,
		columns: true,
		skip_empty_lines: true,
		trim: true,
	})
}

const helper = new Helper<{name: string, sex: 'M' | 'F', age: string}>({
	fileOpts: {
		filePath: path.resolve(__dirname, './test.csv')
	}
});

test('Test Helper.loop(), isSaveOnDone=true', async () => {
	const changeByValue = await helper.loop({
		isSaveOnDone: true,
		isSaveOnError: false,
		transformer: ({row, rows}) => {
			return new Promise((resolve, reject) => {
				setTimeout(() => {
					resolve({
						...row, 
						sex: row.sex === 'F' ? 'M' : 'F'
					})
				}, 20);
			});
		}
	});

	const outputContent = getContent(changeByValue.outputPath);

	expect(outputContent).toStrictEqual([{
		name: 'Peter',
		age: '18',
		sex: 'F' // <===
	}, {
		name: 'Sue',
		age: '16',
		sex: 'M' // <===
	}]);
});

test('Test Helper.loop(), when error occurs', async () => {
	const result = await helper.loop({
		isSaveOnDone: true,
		isSaveOnError: true,
		transformer: ({row, rows}) => {
			return new Promise((resolve, reject) => {
				setTimeout(() => {
					// Trigger error
					if (row.name === 'Sue') {
						return reject(`For testing error.`)
					}

					resolve({
						...row, 
						sex: row.sex === 'F' ? 'M' : 'F'
					})
				}, 20);
			});
		}
	});

	const outputContent = getContent(result.outputPath);

	expect(outputContent).toStrictEqual([{
		name: 'Peter',
		age: '18',
		sex: 'F' // <=== Changed
	}, {
		name: 'Sue',
		age: '16',
		sex: 'F' // <=== When error occurs, keep original data
	}]);
});