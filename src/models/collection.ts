import * as _ from 'lodash';

import type {
	Options
} from 'csv-parse';

import type {
	FileOpts,
	FileWriteResponse
} from './file';

import Parser from './parser';
import * as Logger from '../utils/logger';
import * as UtilsObject from '../utils/object';

export interface CollectionWriteResponse<T> extends FileWriteResponse {
	resultRows: T[]
}

export interface CellCbParams<T> extends RowCbParams<T> {
	cell: string
}

export interface RowCbParams<T> {
	row: T
	rows: T[]
}

export interface CollectionConstructorArgs {
	fileOpts: FileOpts
	parserOpts?: Options
}

export type RowData = {
	[key: string]: string
}

export type CellTransformerSync<T> = (args: RowCbParams<T>) => string;
export type CellTransformerAsync<T> = (args: RowCbParams<T>) => Promise<string>;

export type RowValidatorSync<T> = (args: RowCbParams<T>) => boolean;
export type RowValidatorAsync<T> = (args: RowCbParams<T>) => Promise<boolean>;

export type RowTransformerSync<T> = (args: RowCbParams<T>) => T;
export type RowTransformerAsync<T> = (args: RowCbParams<T>) => Promise<T>;

export type Query<T> = {[key: string]: string} | RowValidatorSync<T> | RowValidatorAsync<T>;
export type CellTransformer<T> = string | CellTransformerSync<T> | CellTransformerAsync<T>;
export type RowTransformer<T> = {[key: string]: string } | RowTransformerSync<T> | RowTransformerAsync<T>;

export default class<T extends RowData> extends Parser<T> {
	constructor(args: CollectionConstructorArgs) {
		super({
			fileOpts: args.fileOpts,
			parserOpts: args.parserOpts
		});
	}

	public async checkIfSuit({
		query,
		rows,
		row
	} : {
		query: Query<T>
		row: T, 
		rows: T[]
	}): Promise<boolean> {
		switch(query.constructor.name) {
			case 'Object':
				return UtilsObject.checkIfPartial(query, row);
			case 'Function':
				return (query as RowValidatorSync<T>)({row, rows});
			case 'AsyncFunction':
				return await (query as RowValidatorAsync<T>)({row, rows});
			default:
				throw new Error(`Passing invalid query.`)
		}
	}

	public async transformRow(transformer: RowTransformer<T>, rowArgs: RowCbParams<T>): Promise<T> {
		switch(transformer.constructor.name) {
			case 'String':
				return {
					...rowArgs.row,
					...transformer
				}
			case 'Function':
				return (transformer as RowTransformerSync<T>)(rowArgs);
			case 'AsyncFunction':
				return await (transformer as RowTransformerAsync<T>)(rowArgs);
			default:
				throw new Error(`Passing wrong type of transformer: ${typeof transformer}`);
		}
	}

	public async transformCell(transformer: CellTransformer<T>, rowArgs: RowCbParams<T>): Promise<string> {
		switch(transformer.constructor.name) {
			case 'String':
				return transformer as string;
			case 'Function':
				return (transformer as CellTransformerSync<T>)(rowArgs);
			case 'AsyncFunction':
				return await (transformer as CellTransformerAsync<T>)(rowArgs);
			default:
				throw new Error(`Passing wrong type of value: ${typeof transformer}`);
		}
	}

	public async filter({
		query,
		once
	}: {
		query: Query<T>;
		once: boolean;
	}): Promise<T[]> {
		const parsedRows = await this.parseFile();
		const result: T[] = [];

		for(const row of parsedRows) {
			if (await this.checkIfSuit({query, row, rows: parsedRows})) {
				result.push(row);

				if (once) {
					break;
				}
			}
		}

		return result;
	}

	public async loop({
		query,
		transformer,
		isSaveOnDone,
		isSaveOnError
	}: {
		query?: Query<T>;
		transformer: RowTransformer<T>;
		isSaveOnDone: boolean;
		isSaveOnError: boolean; // Save the file while encounter failure
	}): Promise<CollectionWriteResponse<T>> {
		const parsedRecords = await this.parseFile();
		const clonedList = parsedRecords.slice();
		const processedRows: T[] = [];
		let curProcessRow: T;

		try {
			while(clonedList.length > 0) {
				const shiftedRow = clonedList.shift();
				curProcessRow = shiftedRow;
				let newRow: T = shiftedRow;

				if (!query || await this.checkIfSuit({
					query,
					row: shiftedRow,
					rows: parsedRecords
				})) {
					newRow = await this.transformRow(transformer, {
						row: shiftedRow,
						rows: parsedRecords
					});
				}
				
				processedRows.push(newRow);
			}

			let fileWriteResp: FileWriteResponse = {
				outputPath: '',
				backupPath: '',
			}

			// Save the file if needed
			if (!!isSaveOnDone) {
				fileWriteResp = await this.writeFile(processedRows);
				Logger.log(`The output file was saved at ${fileWriteResp.outputPath}`);
			}

			return {
				...fileWriteResp,
				resultRows: processedRows
			}
		} catch (error) {
			if (!!isSaveOnError) {
				Logger.log(`Error occurs, now saving the processed data. error: ${error}`);

				const fileWriteResp = await this.writeFile([
					...processedRows,
					curProcessRow,
					...clonedList
				]);

				Logger.log(`The intermediate file was saved at ${fileWriteResp.outputPath}`);

				return {
					...fileWriteResp,
					resultRows: processedRows
				}
			} else {
				Logger.log(`The process is configured not to save file while error occurs. error: ${error}`);
			}

			throw new Error(error);
		}
	}
}