import * as vscode from "vscode";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { createVSIX } from "@vscode/vsce";

export function activate(context: vscode.ExtensionContext) {
    const command = vscode.commands.registerCommand(
        "vsixPackager.packageExtension",
        async () => {
            try {
                // Select the extension to package.
                const folders = await vscode.window.showOpenDialog({
                    canSelectFiles: false,
                    canSelectFolders: true,
                    canSelectMany: false,
                    openLabel: "Select Extension Folder"
                });

                if (!folders?.length) {
                    return;
                }

                const extensionDir = folders[0].fsPath;

                // Validate the selected extension.
                const manifestPath = path.join(
                    extensionDir,
                    "package.json"
                );

                let manifest: {
                    name?: string;
                    publisher?: string;
                    version?: string;
                };

                try {
                    manifest = JSON.parse(
                        await fs.readFile(manifestPath, "utf8")
                    );
                } catch {
                    throw new Error(
                        "The selected folder does not contain a valid package.json."
                    );
                }

                if (
                    !manifest.name ||
                    !manifest.publisher ||
                    !manifest.version
                ) {
                    throw new Error(
                        "The extension manifest must contain name, publisher and version."
                    );
                }

                const defaultName =
                    `${manifest.publisher}.${manifest.name}` +
                    `-${manifest.version}.vsix`;

                // Ask where to save the VSIX.
                const outputUri = await vscode.window.showSaveDialog({
                    defaultUri: vscode.Uri.file(
                        path.join(extensionDir, defaultName)
                    ),
                    saveLabel: "Build VSIX",
                    filters: {
                        "VS Code Extension": ["vsix"]
                    }
                });

                if (!outputUri) {
                    return;
                }

                if (
                    path.resolve(outputUri.fsPath) ===
                    path.resolve(extensionDir)
                ) {
                    throw new Error(
                        "The output file must not be the extension folder."
                    );
                }

                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: `Packaging ${manifest.name} as VSIX`,
                        cancellable: false
                    },
                    async () => {
                        await createVSIX({
                            cwd: extensionDir,
                            packagePath: outputUri.fsPath
                        });
                    }
                );

                const action = "Show in Explorer";

                const choice = await vscode.window.showInformationMessage(
                    `VSIX created: ${outputUri.fsPath}`,
                    action
                );

                if (choice === action) {
                    await vscode.commands.executeCommand(
                        "revealFileInOS",
                        outputUri
                    );
                }
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : String(error);

                vscode.window.showErrorMessage(
                    `VSIX packaging failed: ${message}`
                );
            }
        }
    );

    context.subscriptions.push(command);
}

export function deactivate() {}