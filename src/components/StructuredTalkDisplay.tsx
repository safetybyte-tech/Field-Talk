import React from 'react';
import { AlertTriangle, Shield, CheckCircle, Wrench, HelpCircle, FileText } from 'lucide-react';
import { StructuredTalkContent } from '../types';

interface StructuredTalkDisplayProps {
  content: StructuredTalkContent;
  isEditable?: boolean;
  onContentChange?: (content: StructuredTalkContent) => void;
}

export const StructuredTalkDisplay: React.FC<StructuredTalkDisplayProps> = ({
  content,
  isEditable = false,
  onContentChange
}) => {
  const updateContent = (field: keyof StructuredTalkContent, value: string | string[]) => {
    if (onContentChange) {
      onContentChange({
        ...content,
        [field]: value
      });
    }
  };

  const updateArrayItem = (field: keyof StructuredTalkContent, index: number, value: string) => {
    if (onContentChange && Array.isArray(content[field])) {
      const newArray = [...(content[field] as string[])];
      newArray[index] = value;
      onContentChange({
        ...content,
        [field]: newArray
      });
    }
  };

  const addArrayItem = (field: keyof StructuredTalkContent) => {
    if (onContentChange && Array.isArray(content[field])) {
      const currentArray = content[field] as string[];
      if (currentArray.length < 4) {
        onContentChange({
          ...content,
          [field]: [...currentArray, '']
        });
      }
    }
  };

  const removeArrayItem = (field: keyof StructuredTalkContent, index: number) => {
    if (onContentChange && Array.isArray(content[field])) {
      const newArray = (content[field] as string[]).filter((_, i) => i !== index);
      onContentChange({
        ...content,
        [field]: newArray
      });
    }
  };

  const sections = [
    {
      key: 'hazards' as keyof StructuredTalkContent,
      title: 'Hazards',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      key: 'practices' as keyof StructuredTalkContent,
      title: 'Pre-Task Planning',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      key: 'ppe' as keyof StructuredTalkContent,
      title: 'Personal Protective Equipment (PPE)',
      icon: Shield,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      key: 'sif' as keyof StructuredTalkContent,
      title: 'Serious Injury/Fatality Prevention',
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      key: 'manual' as keyof StructuredTalkContent,
      title: 'Material Handling',
      icon: Wrench,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      key: 'q' as keyof StructuredTalkContent,
      title: 'Discussion Questions',
      icon: HelpCircle,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="text-gray-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-800">Introduction</h3>
        </div>
        {isEditable ? (
          <textarea
            value={content.i}
            onChange={(e) => updateContent('i', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-base leading-relaxed resize-none"
            rows={2}
            placeholder="1-2 sentences introducing the task and safety importance..."
          />
        ) : (
          <p className="text-gray-700 leading-relaxed">{content.i}</p>
        )}
      </div>

      {/* Structured Sections */}
      {sections.map((section) => {
        const Icon = section.icon;
        const items = content[section.key] as string[];
        
        return (
          <div key={section.key} className={`${section.bgColor} border ${section.borderColor} rounded-lg p-4`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon className={section.color} size={20} />
                <h3 className={`text-lg font-semibold ${section.color}`}>{section.title}</h3>
              </div>
              {isEditable && items.length < 4 && (
                <button
                  onClick={() => addArrayItem(section.key)}
                  className={`${section.color} hover:opacity-70 text-sm font-medium`}
                >
                  + Add Item
                </button>
              )}
            </div>
            
            {items.length > 0 ? (
              <ul className="space-y-2">
                {items.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className={`${section.color} mt-1`}>•</span>
                    {isEditable ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => updateArrayItem(section.key, index, e.target.value)}
                          className="flex-1 p-2 border border-gray-300 rounded text-sm"
                          placeholder="Enter safety point (≤12 words)..."
                          maxLength={80}
                        />
                        <button
                          onClick={() => removeArrayItem(section.key, index)}
                          className="text-red-500 hover:text-red-700 text-sm px-2"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-700">{item}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No items added yet</p>
            )}
          </div>
        );
      })}
    </div>
  );
};
