import { useState, useRef, useCallback, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { marked } from 'marked';
import { MESSAGE_CONSTRAINTS } from '../../utils/postal';

interface MessageEditorProps {
  message: string;
  onChange: (message: string) => void;
  isEditing?: boolean;
  onEditingChange?: (isEditing: boolean) => void;
  placeholder?: string;
  autoSave?: boolean;
}

export function MessageEditor({
  message,
  onChange,
  isEditing: externalIsEditing = false,
  onEditingChange,
  placeholder = "Click to add your message...",
  autoSave = true,
}: MessageEditorProps) {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Use external editing state if provided, otherwise use internal state
  const isEditing = externalIsEditing !== undefined ? externalIsEditing : internalIsEditing;

  const setIsEditing = useCallback((newState: boolean) => {
    if (onEditingChange) {
      onEditingChange(newState);
    } else {
      setInternalIsEditing(newState);
    }
  }, [onEditingChange]);

  // Calculate word and character counts
  useEffect(() => {
    const words = message.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setCharacterCount(message.length);
  }, [message]);

  // Auto-save functionality
  const debouncedSave = useCallback((newMessage: string) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      onChange(newMessage);
    }, 500); // 500ms debounce
  }, [onChange]);

  // Handle message change
  const handleMessageChange = useCallback((value?: string) => {
    const newMessage = value || '';

    // Enforce maximum length
    if (newMessage.length > MESSAGE_CONSTRAINTS.maxLength) {
      return; // Prevent changes that exceed the limit
    }

    if (autoSave) {
      debouncedSave(newMessage);
    } else {
      onChange(newMessage);
    }
  }, [autoSave, debouncedSave, onChange]);

  // Handle click on message area
  const handleMessageClick = useCallback(() => {
    if (!isEditing) {
      setIsEditing(true);
    }
  }, [isEditing, setIsEditing]);

  
  // Handle escape key to exit editing
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isEditing) {
      setIsEditing(false);
    }
  }, [isEditing, setIsEditing]);

  // Add keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Click outside to exit editing (type-safe approach)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target
      if (editorRef.current && target instanceof Node && !editorRef.current.contains(target) && isEditing) {
        setIsEditing(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, setIsEditing]);

  // Cleanup auto-save timeout
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const isNearLimit = characterCount > MESSAGE_CONSTRAINTS.maxLength * 0.9;
  const isAtLimit = characterCount >= MESSAGE_CONSTRAINTS.maxLength;

  return (
    <div
      ref={editorRef}
      className={`message-editor relative w-full h-full min-h-[200px] transition-all duration-200 ${
        isEditing ? 'ring-2 ring-blue-400 ring-opacity-50 rounded-md' : ''
      }`}
      onClick={handleMessageClick}
    >
      {isEditing ? (
        <div className="h-full flex flex-col">
          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <MDEditor
              value={message}
              onChange={handleMessageChange}
              preview="edit"
              hideToolbar={false}
              visibleDragbar={false}
              height={300}
              textareaProps={{
                placeholder,
                style: {
                  fontSize: '14px',
                  lineHeight: '1.6',
                  minHeight: '200px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                }
              }}
              data-color-mode="light"
            />
          </div>

          {/* Status bar */}
          <div className="flex justify-between items-center px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs">
            <div className="flex gap-4">
              <span className="text-gray-600">
                Words: <span className="font-medium">{wordCount}</span>
              </span>
              <span className={`font-medium ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-600'}`}>
                Characters: {characterCount}/{MESSAGE_CONSTRAINTS.maxLength}
              </span>
            </div>
            <div className="text-gray-500">
              Press ESC to finish
            </div>
          </div>
        </div>
      ) : (
        <div
          className="message-view w-full h-full p-4 cursor-text hover:bg-blue-50 hover:bg-opacity-20 rounded-md transition-colors duration-200"
          onClick={handleMessageClick}
        >
          {message ? (
            <div
              className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap"
              style={{
                fontSize: '14px',
                lineHeight: '1.6',
                minHeight: '100px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              }}
            >
              {/* Render markdown content as plain text with basic formatting */}
              <div
                dangerouslySetInnerHTML={{
                  __html: marked.parse(message) as string
                }}
              />
            </div>
          ) : (
            <div className="text-gray-400 italic min-h-[100px] flex items-center">
              {placeholder}
            </div>
          )}
        </div>
      )}

      {/* Warning when near character limit */}
      {isNearLimit && !isEditing && (
        <div className={`absolute bottom-2 right-2 text-xs px-2 py-1 rounded ${
          isAtLimit ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {characterCount}/{MESSAGE_CONSTRAINTS.maxLength} chars
        </div>
      )}
    </div>
  );
}

