const fs = require('fs');
const path = require('path');

const dataFolderPath = path.join(__dirname, '..', 'data');
const outputFilePath = path.join(__dirname, '..', 'frontend', 'incidents.json');

function mergeJsonFiles() {
    let mergedData = [];

    try {
        const files = fs.readdirSync(dataFolderPath);

        files.forEach(file => {
            if (path.extname(file).toLowerCase() === '.json') {
                const filePath = path.join(dataFolderPath, file);
                try {
                    const fileContent = fs.readFileSync(filePath, 'utf8');
                    const jsonData = JSON.parse(fileContent);

                    if (Array.isArray(jsonData)) {
                        mergedData = mergedData.concat(jsonData);
                    } else {
                        console.warn(`Warning: ${file} does not contain a JSON array and will be skipped.`);
                    }
                } catch (error) {
                    console.error(`Error reading or parsing ${file}:`, error);
                }
            }
        });

        fs.writeFileSync(outputFilePath, JSON.stringify(mergedData, null, 2), 'utf8');
        console.log(`Successfully merged ${mergedData.length} incidents into ${outputFilePath}`);

    } catch (error) {
        console.error('An error occurred during the merge process:', error);
    }
}

mergeJsonFiles();