import React, { useState, useEffect } from 'react';
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
import { Settings2, StickyNote, Eye, X, Code } from 'lucide-react';
import { interpolateTiptapContent } from '@/lib/interpolation';

interface RightPanelProps {
  template: Template | null;
  onTemplateUpdate: (updates: Partial<Template>) => void;
}

const EmptyState: React.FC = () => (
  <aside className="w-96 p-4 border-l bg-background hidden xl:flex flex-col">
    <div className="flex-1 flex items-center justify-center">
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 border-dashed border-border rounded-lg">
        <Settings2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Template Selected</h3>
        <p className="text-sm text-muted-foreground">
          Select a template from the list to see its properties.
        </p>
      </div>
    </div>
  </aside>
);

export const RightPanel: React.FC<RightPanelProps> = ({
  template,
  onTemplateUpdate,
}) => {
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});

  useEffect(() => {
    setPreviewVariables({});
  }, [template?.id]);

  if (!template) {
    return <EmptyState />;
  }

  const handleUpdate = (updates: Partial<Template>) => {
    onTemplateUpdate(updates);
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

  const handlePreviewVariableChange = (name: string, value: string) => {
    setPreviewVariables(prev => ({ ...prev, [name]: value }));
  };

  const interpolatedContent = template ? interpolateTiptapContent(template.content, previewVariables) : '';

  return (
    <aside className="w-96 p-4 border-l bg-background flex flex-col">
      <h2 className="text-lg font-bold tracking-wider uppercase text-foreground mb-4">
        Properties
      </h2>
      <Tabs defaultValue="properties" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="properties"><StickyNote className="w-4 h-4 mr-2"/>Info</TabsTrigger>
          <TabsTrigger value="variables"><Code className="w-4 h-4 mr-2"/>Variables</TabsTrigger>
          <TabsTrigger value="preview"><Eye className="w-4 h-4 mr-2"/>Preview</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto mt-4 -mr-4 pr-4 space-y-6">
          <TabsContent value="properties" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={template.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleUpdate({ description: e.target.value })}
                    placeholder="Describe what this template is for..."
                    className="min-h-[80px]"
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
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="favorite"
                    checked={template.favorite}
                    onCheckedChange={(checked: boolean) => handleUpdate({ favorite: !!checked })}
                  />
                  <Label htmlFor="favorite">Mark as favorite</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(template.tags || []).map(tag => (
                    <Badge key={tag} variant="secondary" className="font-mono">
                      {tag}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1.5 hover:bg-destructive/20 hover:text-destructive-foreground rounded-full"
                        onClick={() => handleUpdate({ tags: template.tags.filter(t => t !== tag) })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Add a tag and press Enter..."
                  onKeyDown={handleNewTagKeyDown}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div className="flex justify-between"><span>Usage count:</span> <span>{template.usageCount}</span></div>
                <div className="flex justify-between"><span>Created:</span> <span>{new Date(template.createdAt).toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span>Updated:</span> <span>{new Date(template.updatedAt).toLocaleDateString()}</span></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="variables">
             <Card>
              <CardHeader>
                <CardTitle className="text-base">Detected Variables ({template.variables?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {(template.variables || []).length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p className="font-semibold">No variables found.</p>
                    <p className="text-xs mt-1">Add <code className="bg-muted text-muted-foreground p-1 rounded-sm">{`{{VARIABLE}}`}</code> in your template content.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {template.variables.map(variable => (
                      <div key={variable.name} className="p-3 bg-secondary rounded-md">
                        <p className="font-semibold text-secondary-foreground">{variable.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {(template.variables || []).length > 0 && (
                  <div className="space-y-4 mb-6">
                    <h4 className="font-semibold text-muted-foreground">Test Values</h4>
                    {template.variables.map(variable => (
                      <div key={variable.name} className="space-y-2">
                        <Label htmlFor={`preview-var-${variable.name}`}>{variable.name}</Label>
                        <Input
                          id={`preview-var-${variable.name}`}
                          value={previewVariables[variable.name] || ''}
                          onChange={(e) => handlePreviewVariableChange(variable.name, e.target.value)}
                          placeholder={`Enter test value for ${variable.name}...`}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <Separator className={(template.variables || []).length > 0 ? 'my-4' : 'hidden'} />
                <div className="text-sm text-foreground/80">Result</div>
                <div 
                  className="prose dark:prose-invert prose-sm max-w-none p-4 mt-2 border rounded-md bg-secondary/30 min-h-[120px]"
                  dangerouslySetInnerHTML={{ __html: interpolatedContent || "<span class='text-muted-foreground'>No content to preview.</span>" }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}; 