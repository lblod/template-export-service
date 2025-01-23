# template-export-service
Microservice which allows for exporting and importing say-editor templates and snippets

## Installation
Add this service to your docker-compose stack:

```yml
template-export:
  image: lblod/template-export-service
  environment:
    LOGGING_LEVEL: "error"
```

Additonally, in order to effectively use this service, you should set-up resource definitions for the following types in your `mu-cl-resources` config:
- `nfo:FileDataObject`
- `task:Task`
- `oslc:Error`
- `nfo:DataContainer`
- `nfo:Archive`

- `ext:DocumentContainer`
- `ext:EditorDocument`
- `ext:EditorDocumentFolder`
- `say:SnippetList`
- `say:Snippet`
- `say:SnippetVersion`

Examples on how to set-up these definitions can be found on https://github.com/lblod/app-reglementaire-bijlage/tree/master/config/resources



## Configuration options
- `LOGGING_LEVEL` (default: 'info')
  * 'error',
  * 'warn',
  * 'info',
  * 'http',
  * 'verbose',
  * 'debug',
  * 'silly',
- The configuration options of https://github.com/mu-semtech/mu-javascript-template

## How to use this service

This service provides two API endpoints:
- `POST /export`
- `POST /import`

Both API endpoints are only accessible if the current user has access to the "org-wf" group. This will be made configurable later on.

### The `/export` endpoint

This endpoint allows you to request an export for a list of templates (`ext:DocumentContainer`) resources, and a list of snippet-list(`say:SnippetList`) resources. 
Subsequently, this service creates a task which tracks the creation of an export archive.
Once the task has finished and is successful, you can download the `.zip` archive attached to the task.
The generated `.zip` export archive not only contains the requested resources, but also all resources which are required/referenced by the selected resources.

#### Request body format
```json
{
  documentContainerUris: [...],
  snippetListUris: [...]
}
```

#### Response format
```json
{
  data: {
    id: <task_id>,
    attributes: {
      uri: <task_uri>,
      createdOn: <task_created_on>,
      updatedOn: <task_updated_on>,
      status: <task_status>,
      operation: <task_operation_uri>
    }
  }
}
```
The task created by this service follows the `task:Task` model. Check-out https://github.com/lblod/job-controller-service?tab=readme-ov-file#class-1 for more information.


After the task has been created, you should be able to request the status of this task through any endpoint set-up to retrieve `task:Task` resources.

Once the `.zip` archive has been created by this service. It is attached to the task, and the task status is updated to `http://redpencil.data.gift/id/concept/JobStatus/success`. An `nfo:Archive` resource is attached to the task resource through the `task:resultsContainer` predicate. In order to correctly retrieve the `nfo:Archive` resource, you should add the needed configuration to your `mu-cl-resources` config, more on that later. The `nfo:Archive` resource contains a link to the generated `.zip` archive.

The generated `.zip` archive has the following folder structure:
- `documentContainers` contains `.json` files representing the exported `document-container` resources
- `editorDocuments` contains `.json` files representing the exported `editor-document` resources. Note: only the latest/current versions of the `document-container` resources are exported.
- `snippetLists` contains `.json` files representing the exported `snippet-list` resources
- `snippets` contains `.json` files representing the exported `snippet` resources
- `snippetVersions` contains `.json` files representing the exported `snippet-version` resources. Note: only the latest/current versions of the `snippet` resources are exported.

### The `/import` endpoint

This endpoint allows you to upload a `.zip` archive following the same structure as an export archive.
Subsequently, this service creates a task which tracks the import of the resources contained in the archive.
You can again track the progress of the import operation by requesting the status of the provided `task:Task` resource.

#### Request body format
The endpoint expects a body in the `multipart/form-data` format. The `.zip` archive should be encoded in the `file` field.
The following requirements are applied:
- The file should be a `.zip` archive
- The `.zip` archive should contain the correct folder structure. The included `.json` files should follow the correct format.
- The file should not be larger than 1MB

#### Response body format
```json
{
  data: {
    id: <task_id>,
    attributes: {
      uri: <task_uri>,
      createdOn: <task_created_on>,
      updatedOn: <task_updated_on>,
      status: <task_status>,
      operation: <task_operation_uri>
    }
  }
}
```

## Error handling
This service distinguishes errors into two categories:
- Operational errors
- Non-operational (unexpected) errors

### Operational errors

Operational errors are errors which can typically be expected and do/should not disturb the flow of the application service.
This service treats the following error types as 'operational':
- `AppError` errors with `isOperational` set to `true`. These are errors which are explicitely thrown by the service itself and may be exposed to the client. In addition to a message, they also contain an http status code.
- `MulterError` errors. Errors which are thrown by `multer` while parsing `multipart/form-data` request bodies.
- `body-parser` errors. Error which are thrown by `body-parser` while parsing `json` request bodies.

Some examples of operational errors:
- Resource is not found in the database
- Inconsistent data in the database
- Request body does not follow the correct format

The service does *not* exit if such an error occurs.
The error is communicated in the following ways:
- The error is logged
- If the error occurs during a task operation. The error information is linked to the task, and the task status is updated.
- If still possible, an HTTP error response is sent to the client.

### Non-operational errors

Non-operational errors are unexpected and are basically all type of errors which are not seen as 'operational'.

Examples include:
- SPARQL syntax errors
- Unexpected database errors
- Code syntax errors

If such an error occurs, the service *does* exit (unless in 'development' mode).
The error is communicated in the following ways:
- The error is logged
- If the error occurs during a task operation, the task is updated with a generic error message + HTTP status 500.
- If still possible, a generic HTTP error response with status 500 is sent to the client.

If the service exits, it is the responsibility of the orchestrator (e.g. `docker compose`) to restart the service.


## Prefixes used through this document:
```sparql
PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
PREFIX oslc: <http://open-services.net/ns/core#>
PREFIX say: <https://say.data.gift/ns/>
```