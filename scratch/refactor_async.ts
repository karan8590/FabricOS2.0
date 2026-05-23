import { Project, SyntaxKind, CallExpression } from 'ts-morph';

const project = new Project({
    tsConfigFilePath: './tsconfig.json',
});

const sourceFiles = project.getSourceFiles(['app/api/**/*.ts', 'src/**/*.ts', 'lib/**/*.ts']);
let modifiedCount = 0;

sourceFiles.forEach(sourceFile => {
    let fileModified = false;

    while (true) {
        // Fetch fresh descendants to avoid InvalidOperationError
        const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
        const targetCall = calls.find(call => {
            const expr = call.getExpression();
            if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
                const name = expr.getName();
                if (name === 'get' || name === 'all' || name === 'run') {
                    const caller = expr.getExpression();
                    if (caller.getKind() === SyntaxKind.CallExpression) {
                        const callerExpr = (caller as CallExpression).getExpression();
                        if (callerExpr.getKind() === SyntaxKind.PropertyAccessExpression) {
                            if (callerExpr.getName() === 'prepare' && callerExpr.getExpression().getText() === 'db') {
                                const parent = call.getParent();
                                if (parent && parent.getKind() !== SyntaxKind.AwaitExpression) {
                                    return true; // Found an un-awaited db.prepare call
                                }
                            }
                        }
                    }
                }
            }
            return false;
        });

        if (!targetCall) break; // No more targets in this file

        // 1. Ensure parent function is async
        let current = targetCall.getParent();
        while (current) {
            if (current.getKind() === SyntaxKind.FunctionDeclaration ||
                current.getKind() === SyntaxKind.MethodDeclaration ||
                current.getKind() === SyntaxKind.ArrowFunction ||
                current.getKind() === SyntaxKind.FunctionExpression) {
                
                const func = current as any;
                if (!func.isAsync()) {
                    func.setIsAsync(true);
                }
                break; 
            }
            current = current.getParent();
        }

        // 2. Add Await keyword inside parentheses to prevent precedence syntax errors
        targetCall.replaceWithText(`(await ${targetCall.getText()})`);
        fileModified = true;
    }

    if (fileModified) {
        sourceFile.saveSync();
        console.log(`Refactored: ${sourceFile.getFilePath()}`);
        modifiedCount++;
    }
});

console.log(`Finished refactoring ${modifiedCount} files.`);
