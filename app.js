const {TranslationServiceClient} = require('@google-cloud/translate');
const fs = require('fs');

const translationClient = new TranslationServiceClient();

const projectId = 'hyf-translation-project';
const location = 'global';

async function translateText(text) {
    const request = {
        parent: `projects/${projectId}/locations/${location}`,
        contents: [text],
        mimeType: 'text/plain',
        sourceLanguageCode: 'en',
        targetLanguageCode: 'pt-br',
    };

    // Run request
    const [response] = await translationClient.translateText(request);

    for (const translation of response.translations) {
        return translation.translatedText
    }
}

// translateText();

const glob = require("glob");
const mkdirp = require('mkdirp');

const getDirectories = function (src, callback) {
  glob(src + '/**/*', callback);
};

const writeFileContents = async function(pathWithFile, content) {
  const pathWithoutFile = pathWithFile.substring(0,pathWithFile.lastIndexOf('/')+1)

  try {
    if (!fs.existsSync(pathWithoutFile)) {
      await mkdirp(pathWithoutFile);
    }

    fs.appendFileSync(pathWithFile, content);
  } catch (err) {
    console.error(err);
    throw err;
  }
}

function readBytes(fd, sharedBuffer) {
  return new Promise((resolve, reject) => {
      fs.read(
          fd, 
          sharedBuffer,
          0,
          sharedBuffer.length,
          null,
          (err) => {
              if(err) { return reject(err); }
              resolve();
          }
      );
  });
}

async function* generateChunks(filePath, size) {
  const sharedBuffer = Buffer.alloc(size);
  const stats = fs.statSync(filePath); // file details
  const fd = fs.openSync(filePath); // file descriptor
  let bytesRead = 0; // how many bytes were read
  let end = size; 
  
  for(let i = 0; i < Math.ceil(stats.size / size); i++) {
      await readBytes(fd, sharedBuffer);
      bytesRead = (i + 1) * size;
      if(bytesRead > stats.size) {
         // When we reach the end of file, 
         // we have to calculate how many bytes were actually read
         end = size - (bytesRead - stats.size);
      }
      yield sharedBuffer.slice(0, end);
  }
}

getDirectories('original', async function (err, res) {
  if (err) return console.log('Error', err);
  
  const allPaths = res;

  // Only translating .md files
  for (let i=0, len=allPaths.length; i<len; i++) {
    if (allPaths[i].indexOf('.md') === -1) continue;

    const oldFile = allPaths[i];
    const oldFileName = oldFile.substring(oldFile.lastIndexOf('/')+1);
    const oldFolder = oldFile.substring(0,oldFile.lastIndexOf('/')+1);
    const newFolder = oldFolder.replace('original/', 'pt-br/')
    const newFile = __dirname + '/' + newFolder + oldFileName 

    if (fs.existsSync(newFile)) {
      // Cleans file before starting
      fs.writeFileSync(newFile, '');
    }

    for await(const chunk of generateChunks(oldFile, 30000)) {
      await writeFileContents(newFile, await translateText(chunk));
    }

    console.log(`File created: ${newFile}`);
  }
  
});