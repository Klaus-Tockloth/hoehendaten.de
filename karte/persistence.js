// persistence.js

const opfsQueue = [];
let isProcessingOpfsQueue = false;

async function processOpfsQueue() {
  if (isProcessingOpfsQueue || opfsQueue.length === 0) {
    return;
  }

  isProcessingOpfsQueue = true;
  const operation = opfsQueue.shift(); // Get the next operation from the front of the queue
  const { id, type, targetDirectoryName, fileName, content, resolve, reject } = operation;

  let worker = null;
  try {
    worker = new Worker("opfs-worker.js");

    const messageHandler = (event) => {
      if (event.data.id === id) {
        worker.removeEventListener("message", messageHandler); 
        worker.terminate(); 
        isProcessingOpfsQueue = false; 

        if (event.data.status === "success") {
          if (type === "read") {
            resolve(event.data.content);
          } else {
            resolve(event.data);
          }
        } else {
          reject(new Error(event.data.message));
        }
        processOpfsQueue(); 
      }
    };
    worker.addEventListener("message", messageHandler);
   
    worker.addEventListener("error", (err) => {
      worker.removeEventListener("message", messageHandler);
      
      console.error(`Full worker ErrorEvent for ${type} on ${fileName}:`, err);      
      
      const errorMessage = `Worker error in ${err.filename} at line ${err.lineno}: ${err.message}`;
      
      reject(
        new Error(
          `Worker encountered an error for ${type} operation on ${fileName}: ${errorMessage}`
        )
      );
      
      if (worker) {
        worker.terminate();
      }
      isProcessingOpfsQueue = false;
      processOpfsQueue();
    });


    worker.postMessage({
      id,
      type,
      targetDirectoryName,
      fileName,
      content, 
    });
  } catch (error) {   
    console.error(`Failed to initialize worker for ${type} operation on ${fileName}:`, error);
    reject(error);
    if (worker) { 
      worker.terminate();
    }
    isProcessingOpfsQueue = false;
    processOpfsQueue();
  }
}

function queueOpfsOperation(type, directoryName, fileName, content) {
  return new Promise((resolve, reject) => {
    const workerMessageId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    opfsQueue.push({
      id: workerMessageId,
      type,
      targetDirectoryName: directoryName,
      fileName,
      content,
      resolve,
      reject,
    });
    processOpfsQueue();
  });
}

async function writeToOPFS(directoryName, fileName, content) { 
  // TODO HACK - Keeping the original hack values for consistency
  const OPFSonANDROID = false;
  const OPFSonSAFARI = true;

  if (false)
    console.log(
      `---> writeToOPFS: OPFSonANDROID: ${OPFSonANDROID} / OPFSonSAFARI: ${OPFSonSAFARI}`
    );

  if (OPFSonANDROID) {  
    try {
      const root = await navigator.storage.getDirectory();
      const directoryHandle = await root.getDirectoryHandle(directoryName, { create: true });
      const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      console.log(`File "${fileName}" saved to OPFS in directory "${directoryName}".`);
    } catch (error) {
      console.error(
        `Failed to write file "${fileName}" directly to OPFS:`,
        error
      );
      throw error;
    }
  } else if (OPFSonSAFARI) {
    try {
      await queueOpfsOperation("write", directoryName, fileName, content);      
    } catch (workerErr) {
      console.error(
        `Failed to write file "${fileName}" to OPFS via worker queue:`,
        workerErr
      );
      throw workerErr;
    }
  } else {
    console.warn("OPFS write not supported in the current browser configuration.");
    throw new Error("OPFS write not supported.");
  }
}

async function readFromOPFS(directoryName, fileName) {
  const OPFSonANDROID = false;
  const OPFSonSAFARI = true;

  if (false)
    console.log(
      `---> readFromOPFS: OPFSonANDROID: ${OPFSonANDROID} / OPFSonSAFARI: ${OPFSonSAFARI}`
    );

  if (OPFSonANDROID) {    
    try {
      const root = await navigator.storage.getDirectory();
      const directoryHandle = await root.getDirectoryHandle(directoryName); // No create option for reading
      const fileHandle = await directoryHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const content = await file.text(); 
      console.log(`File "${fileName}" read from OPFS in directory "${directoryName}".`);
      return content;
    } catch (error) {
      console.error(
        `Failed to read file "${fileName}" directly from OPFS:`,
        error
      );
      throw error;
    }
  } else if (OPFSonSAFARI) {    
    try {
      const content = await queueOpfsOperation("read", directoryName, fileName);     
      return content;
    } catch (workerErr) {
      console.error(
        `Failed to read file "${fileName}" from OPFS via worker queue:`,
        workerErr
      );
      throw workerErr;
    }
  } else {
    console.warn("OPFS read not supported in the current browser configuration.");
    throw new Error("OPFS read not supported.");
  }
}

async function persist(directoryName, fileName, content) {
  try {
    await writeToOPFS(directoryName, fileName, content);
  } catch (error) {
    console.error("Failed to save CustomData metadata due to a write error:", error);   
    throw error; // Re-throw the error so the caller knows it failed
  }
}

async function retrieve(directoryName, fileName) {
  try {
    const content = await readFromOPFS(directoryName, fileName);
    return content;
  } catch (error) {
    console.error("Failed to retrieve data from OPFS:", error);
  
    throw error; // Re-throw the error so the caller knows it failed
  }
}

async function remove(directoryName, fileName = null) {

  const root = await navigator.storage.getDirectory();

  if (fileName === null) {
    console.log("persistence remove directoryName: ", directoryName);
    // This block handles directory deletion (now recursive)
    try {
      const dirHandle = await root.getDirectoryHandle(directoryName, { create: false });
      await deleteDirectoryRecursively(dirHandle);
      console.log(`Directory "${directoryName}" deleted from OPFS.`);
    } catch (error) {
      if (error.name === "NotFoundError") {
        console.log(`Directory "${directoryName}" not found in OPFS, no need to delete.`);
      } else {
        console.error(
          `Failed to delete directory "${directoryName}" in OPFS:`,
          error
        );
      }
    }
  } else {
    console.log("persistence remove ", directoryName, fileName);
    try {
      let directoryHandle = null;
      if (directoryName === "") {
        directoryHandle = root;
      } else {
        directoryHandle = await root.getDirectoryHandle(directoryName, { create: false });
      }

      await directoryHandle.removeEntry(fileName);
      console.log(
        `File "${fileName}" deleted from directory "${directoryName}" in OPFS.`
      );
    } catch (error) {
      if (error.name === "NotFoundError") {
        console.log(
          `File "${fileName}" or directory "${directoryName}" not found in OPFS, no need to delete.`

        );
      } else if (error.name === "SecurityError") {
        console.error(
          `Security error: Permission denied to access OPFS or directory "${directoryName}".`,
          error
        );
      } else {
        console.error(
          `Failed to delete file "${fileName}" from directory "${directoryName}" in OPFS:`,
          error
        );
      }
    }
  }
}

async function deleteDirectoryRecursively(directoryHandle) {
  for await (const entry of directoryHandle.values()) {
    if (entry.kind === "file") {
      await directoryHandle.removeEntry(entry.name);
    } else if (entry.kind === "directory") {
      const subDirectoryHandle = await directoryHandle.getDirectoryHandle(entry.name);
      await deleteDirectoryRecursively(subDirectoryHandle);
      await directoryHandle.removeEntry(entry.name); // Delete empty subdirectory
    }
  }
}

async function clearOPFS() {
  try {
    const root = await navigator.storage.getDirectory();
    console.log("Starting to clear the entire OPFS.");
   
    for await (const entry of root.values()) {
      if (entry.kind === "file") {        
        await root.removeEntry(entry.name);
        console.log(`Deleted file: ${entry.name}`);
      } else if (entry.kind === "directory") {       
        const directoryHandle = await root.getDirectoryHandle(entry.name);
        await deleteDirectoryRecursively(directoryHandle);
        
        await root.removeEntry(entry.name);
        console.log(`Deleted directory and all its contents: ${entry.name}`);
      }
    }

    console.log("OPFS has been successfully cleared.");
  } catch (error) {
    console.error("An error occurred while clearing the OPFS:", error);
    // Re-throw the error so the calling function is aware of the failure
    throw error;
  }
}

