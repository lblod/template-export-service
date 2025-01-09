import { z } from 'zod';
import { DocumentContainerSchema } from './document-container';
import { EditorDocumentSchema } from './editor-document';
import { SnippetListSchema } from './snippet-list';
import { SnippetSchema } from './snippet';
import { SnippetVersionSchema } from './snippet-version';

export const SerializationSchema = z.object({
  documentContainers: z.array(DocumentContainerSchema),
  editorDocuments: z.array(EditorDocumentSchema),
  snippetLists: z.array(SnippetListSchema),
  snippets: z.array(SnippetSchema),
  snippetVersions: z.array(SnippetVersionSchema),
});

export type Serialization = z.infer<typeof SerializationSchema>;
