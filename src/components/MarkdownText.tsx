import React from 'react';

interface MarkdownTextProps {
  content: string;
  className?: string;
}

const MarkdownText: React.FC<MarkdownTextProps> = ({ content, className = '' }) => {
  const renderContent = () => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let key = 0;

    lines.forEach((line, index) => {
      if (!line.trim()) {
        elements.push(<div key={`br-${key++}`} className="h-2" />);
        return;
      }

      const isListItem = line.trim().startsWith('- ');
      const contentLine = isListItem ? line.replace(/^\s*-\s*/, '') : line;
      
      const parts: (string | React.ReactNode)[] = [];
      let lastIndex = 0;

      const boldRegex = /\*\*([^*]+)\*\*/g;
      let match;

      while ((match = boldRegex.exec(contentLine)) !== null) {
        if (match.index > lastIndex) {
          parts.push(contentLine.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={`bold-${key++}`} className="font-bold text-gray-900 dark:text-white">
            {match[1]}
          </strong>
        );
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < contentLine.length) {
        parts.push(contentLine.substring(lastIndex));
      }

      const content = parts.length > 0 ? parts : contentLine;

      if (isListItem) {
        elements.push(
          <div key={`li-${index}`} className="flex items-start space-x-2 ml-4 my-1">
            <span className="text-gray-600 dark:text-gray-400 mt-0.5">•</span>
            <span className="flex-1">{content}</span>
          </div>
        );
      } else if (line.match(/^[🏠💰🎯💳📊💬📲📖🍽️💡🔒⚠️✨✅💸📈]/)) {
        elements.push(
          <div key={`emoji-${index}`} className="my-2">
            {content}
          </div>
        );
      } else {
        elements.push(
          <div key={`text-${index}`} className="my-1">
            {content}
          </div>
        );
      }
    });

    return elements;
  };

  return <div className={className}>{renderContent()}</div>;
};

export default MarkdownText;
