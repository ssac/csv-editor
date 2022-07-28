import Parser from '../models/parser';
import * as path from 'path';

test('Test parser', async () => {
	const parser = new Parser({
		fileOpts: {
			filePath: path.resolve(__dirname, './test.csv')
		}
	});

	const rows = await parser.parseFile();

	expect(rows).toStrictEqual([{
		name: 'Peter',
		sex: 'M',
		age: "18"
	}, {
		name: 'Sue',
		sex: 'F',
		age: "16"
	}]);
});