// frontend/components/RichEmojiInput.tsx
'use client';

import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

const toHex = (str: string) => {
  return Array.from(str)
    .map(c => c.codePointAt(0)?.toString(16))
    .join('-')
    .toLowerCase();
};

const APPLE_EMOJI_BASE_URL = '/emojis/';

interface RichEmojiInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isDarkMode: boolean;
  className?: string;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  textPaddingRightPx?: number;
  disabled?: boolean; // Добавлено
}

const RichEmojiInput = forwardRef<HTMLDivElement, RichEmojiInputProps>(({
  value,
  onChange,
  placeholder,
  isDarkMode,
  className,
  onKeyDown,
  textPaddingRightPx = 40,
  disabled = false, // Добавлено
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  
  useImperativeHandle(ref, () => editorRef.current as HTMLDivElement);

  const escapeHtml = (text: string): string =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const renderContentWithImages = (text: string): string => {
    const safe = escapeHtml(text);
    const emojiRegex = /\p{Emoji_Presentation}/gu;
    return safe.replace(emojiRegex, (emoji) => {
      if (/^[a-z0-9_]+$/i.test(emoji)) return emoji;
      const hex = toHex(emoji);
      return `<img src="${APPLE_EMOJI_BASE_URL}${hex}.png" alt="${emoji}" class="inline-block w-5 h-5 mx-px align-text-bottom select-none pointer-events-none" data-emoji="true" />`;
    });
  };

  const getNodeLength = (node: Node): number => {
    if (node.nodeType === Node.TEXT_NODE) { return (node.textContent || '').length; }
    if (node.nodeName === 'IMG') { return (node as HTMLImageElement).alt.length; }
    return 0;
  };

  const getCaretIndex = (element: HTMLElement): number => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    const range = selection.getRangeAt(0);
    if (!element.contains(range.startContainer)) return 0;
    let totalOffset = 0;
    let found = false;
    for (let i = 0; i < element.childNodes.length; i++) {
        const node = element.childNodes[i];
        if (node === range.startContainer) {
            totalOffset += range.startOffset;
            found = true;
            break;
        } else if (range.startContainer === element && range.startOffset === i) {
            found = true;
            break;
        }
        totalOffset += getNodeLength(node);
    }
    if (!found && range.startContainer === element && range.startOffset === element.childNodes.length) {
        return totalOffset;
    }
    return found ? totalOffset : 0;
  };

  const setCaretIndex = (element: HTMLElement, index: number) => {
    const range = document.createRange();
    const selection = window.getSelection();
    let currentLength = 0;
    let found = false;
    for (let i = 0; i < element.childNodes.length; i++) {
      const node = element.childNodes[i];
      const nodeLen = getNodeLength(node);
      if (currentLength + nodeLen >= index) {
        if (node.nodeType === Node.TEXT_NODE) {
          range.setStart(node, index - currentLength);
          range.collapse(true);
        } else if (node.nodeName === 'IMG') {
          range.setStartAfter(node);
          range.collapse(true);
        }
        found = true;
        break;
      }
      currentLength += nodeLen;
    }
    if (!found) {
      range.selectNodeContents(element);
      range.collapse(false);
    }
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  useEffect(() => {
    if (editorRef.current) {
        let caretPos = 0;
        const isFocused = document.activeElement === editorRef.current;
        if (isFocused) { caretPos = getCaretIndex(editorRef.current); }
        const newHtml = renderContentWithImages(value);
        if (editorRef.current.innerHTML !== newHtml) {
            editorRef.current.innerHTML = newHtml;
            if (isFocused) { setCaretIndex(editorRef.current, caretPos); }
        }
    }
  }, [value]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    let newText = '';
    target.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) { newText += node.textContent; } 
      else if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).dataset.emoji) { newText += (node as HTMLImageElement).alt; }
    });
    onChange(newText);
  };

  return (
    <div className={`relative ${className} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {!value && (
        <div 
          className={`absolute top-3 left-3 text-sm pointer-events-none transition-colors ${isDarkMode ? 'text-white/60' : 'text-zinc-500'}`}
          style={{ right: `${textPaddingRightPx}px` }}
        >
          {placeholder}
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable={!disabled} // Изменено
        onInput={handleInput}
        onKeyDown={onKeyDown}
        className={`w-full rounded-xl p-3 text-sm outline-none overflow-y-auto custom-scrollbar leading-relaxed resize-none
          ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}
          whitespace-pre-wrap break-all overflow-x-hidden max-h-40
        `}
        style={{ paddingRight: `${textPaddingRightPx}px` }}
        onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        }}
      />
    </div>
  );
});

RichEmojiInput.displayName = 'RichEmojiInput';
export default RichEmojiInput;