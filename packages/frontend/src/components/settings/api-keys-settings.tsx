import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { settingsApi, type ApiKeyStatus } from '@/lib/api';
import { IconCheck, IconX, IconDatabase, IconVariable, IconTrash } from '@tabler/icons-react';

export function ApiKeysSettings() {
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const status = await settingsApi.getApiKey();
      setApiKeyStatus(status);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newKey.trim()) return;
    
    try {
      setSaving(true);
      setMessage(null);
      const result = await settingsApi.setApiKey('openai', newKey.trim());
      setApiKeyStatus(result);
      setNewKey('');
      setMessage({ type: 'success', text: 'API key saved successfully' });
    } catch (err) {
      console.error('Failed to save key:', err);
      setMessage({ type: 'error', text: 'Failed to save API key' });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      setClearing(true);
      setMessage(null);
      await settingsApi.clearApiKey('openai');
      await fetchStatus();
      setMessage({ type: 'success', text: 'API key cleared from database' });
    } catch (err) {
      console.error('Failed to clear key:', err);
      setMessage({ type: 'error', text: 'Failed to clear API key' });
    } finally {
      setClearing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>OpenAI Configuration</CardTitle>
        <CardDescription>
          Configure your OpenAI API key to enable AI features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading settings...</div>
        ) : (
          <>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
              <div className="space-y-1">
                <div className="text-sm font-medium flex items-center gap-2">
                  Status
                  {apiKeyStatus?.hasKey ? (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">Configured</Badge>
                  ) : (
                    <Badge variant="destructive">Missing</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  Source: 
                  {apiKeyStatus?.source === 'env' ? (
                    <span className="flex items-center gap-1"><IconVariable size={12} /> Environment Variable</span>
                  ) : apiKeyStatus?.source === 'database' ? (
                    <span className="flex items-center gap-1"><IconDatabase size={12} /> Database</span>
                  ) : (
                    'None'
                  )}
                </div>
              </div>
              {apiKeyStatus?.stored && (
                <code className="text-xs bg-background px-2 py-1 rounded border">
                  {apiKeyStatus.stored}
                </code>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {apiKeyStatus?.hasKey ? 'Update API Key' : 'Add API Key'}
              </label>
              <div className="flex gap-2">
                <Input 
                  type="password" 
                  placeholder="sk-..." 
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                />
                <Button 
                  onClick={handleSave} 
                  disabled={saving || !newKey.trim()}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your API key is stored securely in your database or loaded from environment variables.
              </p>
            </div>

            {message && (
              <div className={`text-sm flex items-center gap-2 ${
                message.type === 'success' ? 'text-green-600' : 'text-destructive'
              }`}>
                {message.type === 'success' ? <IconCheck size={16} /> : <IconX size={16} />}
                {message.text}
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="justify-between border-t bg-muted/20 px-6 py-4">
         <div className="text-xs text-muted-foreground">
           Required for resume generation and analysis features.
         </div>
         {apiKeyStatus?.source === 'database' && (
           <Button 
             variant="destructive" 
             size="sm" 
             onClick={handleClear}
             disabled={clearing}
           >
             <IconTrash size={14} className="mr-1" />
             {clearing ? 'Clearing...' : 'Clear Stored Key'}
           </Button>
         )}
      </CardFooter>
    </Card>
  );
}
