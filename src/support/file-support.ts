import { uuid } from 'mu';
import { stat } from 'fs/promises';
import AdmZip from 'adm-zip';
import { createLogicalFile, createPhysicalFile } from '../db/file';

type ExportObject = object & { id: string };

// TODO Error handling
export async function createZip(
  resourcesToExport: Record<string, ExportObject[]>
) {
  const zip = new AdmZip();
  Object.entries(resourcesToExport).forEach(([resource, entities]) => {
    entities?.forEach((entity) => {
      zip.addFile(
        `${resource}/${entity.id}.json`,
        Buffer.from(JSON.stringify(entity))
      );
    });
  });
  const name = `${uuid()}.zip`;
  const path = `/share/${name}`;
  await zip.writeZipPromise(path);
  const stats = await stat(path);
  const size = stats.size;
  const createdOn = new Date();
  const logicalFileUuid = uuid();
  const logicalFileUri = `http://lblod.data.gift/files/${logicalFileUuid}`;
  const physicalFileUri = `share://${name}`;
  const commonData = {
    name,
    format: 'application/zip',
    extension: 'zip',
    size,
    createdOn,
  };

  const logicalPromise = createLogicalFile({
    id: logicalFileUuid,
    uri: logicalFileUri,
    ...commonData,
  });

  const physicalPromise = createPhysicalFile({
    ...commonData,
    uri: physicalFileUri,
    sourceUri: logicalFileUri,
  });

  return Promise.all([logicalPromise, physicalPromise]).then(
    ([logicalFile, physicalFile]) => ({
      logicalFileUri: logicalFile.uri,
      physicalFileUri: physicalFile.uri,
    })
  );
}
