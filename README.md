# CSV Editor

Utilities to manipulate .csv file along with parse and output features.

## Usages

Test data:

|name|sex|age|
|--|--|--|
|Peter|M|18|
|Sue|F|16|

For brevity, the rest of the examples will leave out the import and/or instantiation step.
```typescript
import { DbLike } from '@ssac/csv-editor';

// "name" is the id key name
const helper = new DbLike<"name", {name: string, sex: 'M' | 'F', age: string}>({
	fileOpts: {
		filePath: path.resolve(__dirname, './test.csv')
	},
	dbLikeOpts: {
		idField: 'name'
	}
});
```

#### Query cell by id
```typescript
const age = await helper.getCellById({
	idValue: 'Peter',
	targetField: 'age'
});

// age === '18'
```

#### Edit cell value by passing direct value
```typescript
const changedByDirectValue = await helper.editFieldById({
	idValue: 'Peter', // If the id is 'Peter'
	field: 'age', // Change this field
	value: '25', // <=== Change to this value
	isSaveOnDone: false,
});
```
Output:

|name|sex|age|
|--|--|--|
|Peter|M|_**25**_|
|Sue|F|16|


#### Edit cell value by passing call back function (sync or async)
```typescript
// Inverse sex value if `name` === 'Peter'

const changedByFunc = await helper.editFieldById({
	idValue: 'Peter',
	field: 'sex',
	isSaveOnDone: false,
	
	// Option 1:
	value: ({row, rows}) => {
		return row.sex === 'F' ? 'M' : 'F'
	},
	
	// Option 2:
	value: async ({row, rows}) => {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				resolve(row.sex === 'F' ? 'M' : 'F')
			}, 20);
		});
	},
});
```
Output:

|name|sex|age|
|--|--|--|
|Peter|_**F**_|18|
|Sue|F|16|


#### Manipulate rows one by one
```typescript
import Collection from '@ssac/csv-editor';

// "name" is the id key name
const helper = new Collection<{name: string, sex: 'M' | 'F', age: string}>({
	fileOpts: {
		filePath: path.resolve(__dirname, './test.csv')
	}
});

const changeByValue = await helper.loop({
	isSaveOnDone: true,
	isSaveOnError: false,
	// Inverse sex value of all rows
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
```
Output:

|name|sex|age|
|--|--|--|
|Peter|_**F**_|18|
|Sue|_**M**_|16|


## API docs
### `DbLike` Class
This is a class to handle a list of object with unique ID.
Initialize the helper like below:

```typescript
import { DbLike } from 'csv-editor';
import * as path from 'path';

const helper = new DbLike({
    fileOpts: {
        filePath: path.resolve(__dirname, './test.csv'),
        outputPath: path.resolve(__dirname, './test-output.csv'),
    },
    parseOpts: {
        // Same as the options of `https://github.com/mafintosh/csv-parser`
    },
    dbLikeOpts: {
        idField: 'id' // `id` is the property name of unique cell
    }
})
```

#### .getCellById(...)
```typescript
// Get user's age for user whose id equal to 'id001'

const cellValue: string = await helper.getCellById({
    idValue, // `id001`
    targetField // `age`
})
```

#### .editCellById(...)
```typescript
const resp: CollectionWriteResponse = await helper.editCellById(args: {
    idValue: string; // e.g. 'id001'
    field: string; // e.g. 'age'
    value: CellTransformer;
    isSaveOnDone: boolean;
})
```
##### `value`
How to change the cell value.
- Direct value. Assign the value directly to a field.
- A call back function: `({row, rows}) => string`
- Async call back function: `async ({row, rows}) => Promise<string>`

##### `isSaveOnDone`
When the edit is done, save the file automatically.

### `Collection` class

#### .loop(...)
```typescript
const resp: CollectionWriteResponse = await helper.loop(args: {
    query?: Query,
    transformer: RowTransformer,
    isSaveOnDone: boolean,
    isSaveOnError?: boolean,
});
```

##### `isSaveOnDone`
When the process is completed, save the file automatically.

##### `isSaveOnError`
When error occurs during the process, save processed result rows + non handled rows.


### .rewrite()
Rewrite all rows with your customized logic. 
Use this function if you want to edit the all rows together only.
If you want to edit rows one by one, use .loop instead.
.sort(...) call this function under the hood.

```typescript
// Filter only male record.
const resp: CollectionWriteResponse = await helper.rewrite({
	transform: async (clonedRows) => {
		return clonedRows.filter(row => row.sex === 'M')
	}
})
```

Output:

|name|sex|age|
|--|--|--|
|Peter|M|18|


### .sort(compareFn)
```typescript
// Sort row by age from small to large
const resp: CollectionWriteResponse = await helper.sort(function(row1, row2) {
	return (Number(row1.age)) - (Number(row2.age))
});
```

##### `compareFn`
The sort function to sort all rows of csv file.

|return value|sort order|
|-|-|
|>0|sort a after b|
|<0|sort a before b|
|===0|keep original order of a and b|


### Common types

##### Row
A pure object.
```typescript
{[key: string]: string}
```

##### RowWithId
A object with a property which value is unique in the same column of all rows.
```typescript
type RowData<K extends string> = {
  [id in K]: string;
} & {
  [key: string]: string;
};
```

##### Query
Used to filter rows need to be modified. All rows will be modified without this passed in.
- Direct object: `{id: 'id001'}`
- Call back function: `({row, rows}) => boolean`
- Async call back function: `async ({row, rows}) => Promise<boolean>`

##### RowTransformer
Define how to modify a row, returning a new row.
- Direct object: {group: 'GroupA'
- Call back function: ({row, rows}) => Row
- Async call back function: async ({row, rows}) => Promise<Row>

#### CollectionWriteResponse
The response contains row edit result.
- `outputPath`: string; If the file was saved after function run, return the path of the output file, otherwise it will be ''.
- `backupPath`: string; If the input file and output file are the same path, this lib backup the file automatically and this is the backup file path. Return '' if no backup action run.
- `resultRows`: object[]; a collection of rows after processed.

## Testing
Test with jest
```
npm run test
```