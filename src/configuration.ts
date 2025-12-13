import * as vscode from 'vscode';

export interface SmartKeysConfiguration {
	smartEnd: {
		indentEmptyLine: boolean;
		toggleTrimmedEnd: boolean;
	};
	smartBackspace: {
		handleEmptyLine: boolean;
		handleIndentZone: boolean;
	};
	smartEnter: {
		autoInsertClosingBrace: boolean;
	};
}

function getBoolean(config: vscode.WorkspaceConfiguration, key: string): boolean {
	return config.get<boolean>(key, true);
}

export function getSmartKeysConfiguration(): SmartKeysConfiguration {
	const config = vscode.workspace.getConfiguration('smart-keys');

	return {
		smartEnd: {
			indentEmptyLine: getBoolean(config, 'smartEnd.indentEmptyLine'),
			toggleTrimmedEnd: getBoolean(config, 'smartEnd.toggleTrimmedEnd')
		},
		smartBackspace: {
			handleEmptyLine: getBoolean(config, 'smartBackspace.handleEmptyLine'),
			handleIndentZone: getBoolean(config, 'smartBackspace.handleIndentZone')
		},
		smartEnter: {
			autoInsertClosingBrace: getBoolean(config, 'smartEnter.autoInsertClosingBrace')
		}
	};
}
