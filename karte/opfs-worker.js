// opfs-worker.js

self.onmessage = async (event) => {
  const { id, type, fileName, content, targetDirectoryName } = event.data;

  if (type === "write" || type === "writeMetadata") {
    let accessHandle; 
    try {
      const root = await navigator.storage.getDirectory();
      let parentDirectoryHandle;
      
      if (targetDirectoryName && typeof targetDirectoryName === 'string' && targetDirectoryName.length > 0) {       
        parentDirectoryHandle = await root.getDirectoryHandle(targetDirectoryName, { create: true });
      } else {
        parentDirectoryHandle = root; 
      }

      const fileHandle = await parentDirectoryHandle.getFileHandle(fileName, {
        create: true,
      });
    
      accessHandle = await fileHandle.createSyncAccessHandle();
     
      accessHandle.truncate(0);
    
      let buffer;
      if (typeof content === 'string') {
        buffer = new TextEncoder().encode(content);
      } else if (content instanceof Blob) {       
        buffer = await content.arrayBuffer();
      } else {        
        throw new Error("Unsupported content type. Content must be a string or a Blob.");
      }

      accessHandle.write(buffer, { at: 0 });
      accessHandle.close();

      self.postMessage({ id, status: "success", message: "File written successfully." });
    } catch (error) {
      const directoryInfo = targetDirectoryName ? ` into "${targetDirectoryName}"` : "";
      console.error(`Worker failed to write file "${fileName}"${directoryInfo}:`, error);
      self.postMessage({ id, status: "error", message: `Worker failed to write file: ${error.message}` });
    } finally {
        if (accessHandle) {
            accessHandle.close();
        }
    }
  } else if (type === "read") {
    let accessHandle; 
    try {
      const root = await navigator.storage.getDirectory();
      let parentDirectoryHandle;

      if (targetDirectoryName && typeof targetDirectoryName === 'string' && targetDirectoryName.length > 0) {
        parentDirectoryHandle = await root.getDirectoryHandle(targetDirectoryName);
      } else {
        parentDirectoryHandle = root;
      }

      let fileContent = ""; 

      try {
        const fileHandle = await parentDirectoryHandle.getFileHandle(fileName);
        
        accessHandle = await fileHandle.createSyncAccessHandle();
        const fileSize = accessHandle.getSize();
        const buffer = new ArrayBuffer(fileSize);
        accessHandle.read(new Uint8Array(buffer), { at: 0 });
        fileContent = new TextDecoder().decode(buffer);

      } catch (fileError) {      
        if (fileError.name === 'NotFoundError') {
          // console.warn(`Worker attempted to read file "${fileName}" which does not exist. Returning empty string.`);
          // fileContent is already an empty string from its default declaration
        } else {
          // Re-throw other errors to be caught by the outer try-catch
          throw fileError;
        }
      } finally {
        // Ensure accessHandle is closed even if file was not found or an error occurred during read attempt
        if (accessHandle) {
          accessHandle.close();
        }
      }

      self.postMessage({ id, status: "success", content: fileContent, message: "File read successfully." });
    } catch (error) {
      const directoryInfo = targetDirectoryName ? ` from "${targetDirectoryName}"` : "";
      console.error(`Worker failed to read file "${fileName}"${directoryInfo}:`, error);
      self.postMessage({ id, status: "error", message: `Worker failed to read file: ${error.message}` });
    }
  } else {
    self.postMessage({ id, status: "error", message: `Unknown message type: ${type}` });
  }
};
