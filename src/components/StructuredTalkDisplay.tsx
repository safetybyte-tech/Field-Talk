import { AutoSizeTextarea } from './AutoSizeTextarea';
import React from 'react';
import { AlertTriangle, Shield, CheckCircle, Wrench, HelpCircle, FileText, ExternalLink, Scale } from 'lucide-react';
import { StructuredTalkContent, TalkCitation } from '../types';

const CitationBadges: React.FC<{ citations: TalkCitation[] }> = ({ citations }) => {
  if (citations.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {citations.map((citation) => (
        <a
          key={citation.citation}
          href={citation.source_url}
          target="_blank"
          rel="noopener noreferrer"
          title={`${citation.title || citation.subpart_title || 'OSHA standard'} — view on eCFR (unofficial text; verify against the official CFR)`}
          className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white min-h-11 px-3 py-2 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-700"
        >
          <ExternalLink size={10} />
          29 CFR {citation.citation}
        </a>
      ))}
    </div>
  );
};

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
      {
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

  const citations = content.citations ?? [];
  const citationsForSection = (key: string): TalkCitation[] =>
    citations.filter((citation) => citation.sections?.includes(key));

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="text-gray-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-800">Introduction</h3>
        </div>
        {isEditable ? (
          <AutoSizeTextarea
            aria-label="Introduction"
            value={content.i}
            onChange={(e) => updateContent('i', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-base leading-relaxed resize-none"
            placeholder="1-2 sentences introducing the task and safety importance..."
          />
        ) : (
          <p className="text-gray-700 leading-relaxed">{content.i}</p>
        )}
        <CitationBadges citations={citationsForSection('i')} />
      </div>

      {/* Structured Sections */}
      {sections.map((section) => {
        const Icon = section.icon;
        const items = content[section.key] as string[];
        
        return (
          <div key={section.key} className={`${section.bgColor} border ${section.borderColor} rounded-lg p-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Icon className={section.color} size={20} />
                <h3 className={`text-lg font-semibold ${section.color}`}>{section.title}</h3>
              </div>
              {isEditable && (
                <button
                  onClick={() => addArrayItem(section.key)}
                  aria-label={`Add ${section.title} item`}
                  className={`${section.color} min-h-11 shrink-0 px-2 hover:opacity-70 text-sm font-medium`}
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
                      <div className="min-w-0 flex-1 flex items-start gap-2">
                        <AutoSizeTextarea
                          aria-label={`${section.title} item ${index + 1}`}
                          value={item}
                          onChange={(e) => updateArrayItem(section.key, index, e.target.value)}
                          className="min-w-0 w-full flex-1 min-h-11 p-2 border border-gray-300 rounded text-base leading-relaxed"
                          placeholder="Add a specific safety action..."
                        />
                        <button
                          onClick={() => removeArrayItem(section.key, index)}
                          aria-label={`Remove ${section.title} item ${index + 1}`}
                          className="shrink-0 min-h-11 min-w-11 text-red-600 hover:text-red-700 text-lg px-2"
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
            <CitationBadges citations={citationsForSection(section.key)} />
          </div>
        );
      })}

      {/* Referenced OSHA standards + unofficial-text disclaimer */}
      {citations.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="text-slate-600" size={18} />
            <h3 className="text-sm font-semibold text-slate-700">Referenced OSHA Standards</h3>
          </div>
          <ul className="space-y-1">
            {citations.map((citation) => (
              <li key={citation.citation} className="text-sm text-slate-600">
                <a
                  href={citation.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline"
                >
                  29 CFR {citation.citation}
                  <ExternalLink size={12} />
                </a>
                {citation.title || citation.subpart_title ? ` — ${citation.title || citation.subpart_title}` : ''}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            OSHA standard text referenced here is unofficial. Verify against the official CFR on{' '}
            <a
              href="https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1926"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-700"
            >
              eCFR.gov
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
};
