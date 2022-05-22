const {TranslationServiceClient} = require('@google-cloud/translate');
const fs = require('fs');

// Instantiates a client
const translationClient = new TranslationServiceClient();

const projectId = 'hyf-translation-project';
const location = 'global';

async function translateText(text) {
    // Construct request
    const request = {
        parent: `projects/${projectId}/locations/${location}`,
        contents: [text],
        mimeType: 'text/plain', // mime types: text/plain, text/html
        sourceLanguageCode: 'en',
        targetLanguageCode: 'pt-br',
    };

    // Run request
    const [response] = await translationClient.translateText(request);

    console.log(response);

    for (const translation of response.translations) {
        console.log(`Translation: ${translation.translatedText}`);
        return translation.translatedText

    }
}

// translateText();

const glob = require("glob");

const getDirectories = function (src, callback) {
  glob(src + '/**/*', callback);
};

const readFileContents = function (path) {
  try {
    const data = fs.readFileSync(path, 'utf8');
    return data;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const writeFileContents = function(pathWithFile, content) {
  const pathWithoutFile = pathWithFile.substring(0,pathWithFile.lastIndexOf('/')+1)

  try {
    if (!fs.existsSync(pathWithoutFile)) {
      fs.mkdirSync(pathWithoutFile);
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

getDirectories('hyf-fullstack-curriculum-pt-br', async function (err, res) {
  if (err) return console.log('Error', err);
  
  const allPaths = res;

  for (let i=0, len=allPaths.length; i<len; i++) {
    if (allPaths[i].indexOf('.md') === -1) continue;

    const oldFile = allPaths[i];
    const oldFileName = oldFile.substring(oldFile.lastIndexOf('/')+1);
    const oldFolder = oldFile.substring(0,oldFile.lastIndexOf('/')+1);
    const newFile = oldFolder + '/pt-br/' + oldFileName 

    // const translatedText = await translateText(readFileContents(oldFile));

    for await(const chunk of generateChunks(oldFile, 30000)) {
      // do someting with data       
      writeFileContents(newFile, await translateText(chunk))
    }

  }
  
});