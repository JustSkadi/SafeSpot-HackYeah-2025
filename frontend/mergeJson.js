// mergeJson.js
const fs = require('fs').promises;
const path = require('path');

/**
 * Merges all JSON files from a folder into a single JSON file
 * @param {string} sourceFolder - Path to folder containing JSON files
 * @param {string} outputFile - Path to output file
 * @param {Object} options - Configuration options
 * @param {boolean} options.asObject - Merge as object with filenames as keys (default: false)
 * @param {boolean} options.prettyPrint - Format output JSON (default: true)
 * @returns {Promise<Object>} Merged data
 */
async function mergeJsonFiles(sourceFolder, outputFile, options = {}) {
  const { asObject = false, prettyPrint = true } = options;

  try {
    // Read all files from the source folder
    const files = await fs.readdir(sourceFolder);
    
    // Filter only JSON files
    const jsonFiles = files.filter(file => path.extname(file) === '.json');
    
    if (jsonFiles.length === 0) {
      throw new Error(`No JSON files found in ${sourceFolder}`);
    }

    // Initialize merged data structure
    let mergedData = asObject ? {} : [];

    // Read and merge each JSON file
    for (const file of jsonFiles) {
      const filePath = path.join(sourceFolder, file);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const jsonData = JSON.parse(fileContent);
      
      if (asObject) {
        // Merge as object with filename as key
        const key = path.basename(file, '.json');
        mergedData[key] = jsonData;
      } else {
        // Merge as array
        if (Array.isArray(jsonData)) {
          mergedData = mergedData.concat(jsonData);
        } else {
          mergedData.push(jsonData);
        }
      }
    }

    // Write merged data to output file
    const jsonString = prettyPrint 
      ? JSON.stringify(mergedData, null, 2)
      : JSON.stringify(mergedData);
      
    await fs.writeFile(outputFile, jsonString);
    
    return {
      success: true,
      filesProcessed: jsonFiles.length,
      data: mergedData
    };
    
  } catch (error) {
    throw new Error(`Failed to merge JSON files: ${error.message}`);
  }
}

module.exports = mergeJsonFiles;