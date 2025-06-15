import React from 'react';
import { Template } from '../../../types/template';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2, StickyNote, Eye, X } from 'lucide-react';

interface RightPanelProps {
  template: Template | null;
  onTemplateUpdate: (template: Template) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  template,
  onTemplateUpdate,
}) => {
  if (!template) {
    return (
      <aside className="w-96 p-4 border-l bg-background hidden xl:flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full h-full flex flex-col items-center justify-center text-center p-6 border-dashed">
            <Settings2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No Template Selected</h3>
            <p className="text-sm text-muted-foreground">
              Select a template to view its properties.
            </p>
          </Card>
        </div>
      </aside>
    );
  }

  const handleUpdate = (updates: Partial<Template>) => {
    onTemplateUpdate({ ...template, ...updates, updatedAt: Date.now() });
  };

  const handleNewTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = e.currentTarget.value.trim();
      if (newTag && !template.tags?.includes(newTag)) {
        handleUpdate({ tags: [...(template.tags || []), newTag] });
      }
      e.currentTarget.value = '';
    }
  };

  return (
    <aside className="w-96 p-4 border-l bg-background flex-col hidden xl:flex">
      <h2 className="text-xl font-semibold mb-4">Properties</h2>
      <Tabs defaultValue="properties" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="properties"><StickyNote className="w-4 h-4 mr-2"/>Properties</TabsTrigger>
          <TabsTrigger value="variables"><Settings2 className="w-4 h-4 mr-2"/>Variables</TabsTrigger>
          <TabsTrigger value="preview"><Eye className="w-4 h-4 mr-2"/>Preview</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto mt-4 -mr-2 pr-2">
          <TabsContent value="properties">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={template.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleUpdate({ description: e.target.value })}
                    placeholder="Describe what this template is for..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={template.category}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdate({ category: e.target.value })}
                    placeholder="e.g., email, social"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="favorite"
                    checked={template.favorite}
                    onCheckedChange={(checked: boolean) => handleUpdate({ favorite: !!checked })}
                  />
                  <Label htmlFor="favorite">Mark as favorite</Label>
                </div>
              </CardContent>
            </Card>

            <Separator className="my-6" />

            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {template.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1"
                        onClick={() => handleUpdate({ tags: template.tags.filter(t => t !== tag) })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Add a tag..."
                  onKeyDown={handleNewTagKeyDown}
                />
              </CardContent>
            </Card>
            
            <Separator className="my-6" />

            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>Usage count: {template.usageCount}</p>
                <p>Created: {new Date(template.createdAt).toLocaleDateString()}</p>
                <p>Updated: {new Date(template.updatedAt).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="variables">
             <Card>
              <CardHeader>
                <CardTitle>Variables ({template.variables.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {template.variables.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No variables found.</p>
                    <p className="text-xs">Add {`{{VARIABLE_NAME}}`} in your template content.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {template.variables.map(variable => (
                      <Card key={variable.name} className="p-4">
                        <p className="font-semibold">{variable.name}</p>
                        <p className="text-sm text-muted-foreground">Type: {variable.type}</p>
                        {variable.required && <Badge variant="outline">Required</Badge>}
                        {variable.description && <p className="text-sm mt-2">{variable.description}</p>}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert prose-sm max-w-none p-4 border rounded-md bg-secondary/30 min-h-[100px]">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {template.content || "No content to preview."}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}; 