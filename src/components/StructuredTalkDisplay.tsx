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
          className="snd-mono inline-flex min-h-11 items-center gap-1 rounded-sm border border-rule bg-sheet px-3 py-2 text-xs font-medium text-ink-muted hover:border-accent hover:text-accent-text"
        >
          <ExternalLink size={12} />
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

type Severity = 'stop' | 'caution' | 'neutral';

const severityClasses: Record<Severity, { label: string; icon: string }> = {
  stop: { label: 'text-stop-text', icon: 'text-stop' },
  caution: { label: 'text-caution-text', icon: 'text-caution' },
  neutral: { label: 'text-ink-muted', icon: 'text-ink-faint' },
};

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

  const sections: { key: keyof StructuredTalkContent; title: string; icon: typeof AlertTriangle; severity: Severity }[] = [
    { key: 'hazards', title: 'Hazards', icon: AlertTriangle, severity: 'caution' },
    { key: 'practices', title: 'Pre-Task Planning', icon: CheckCircle, severity: 'neutral' },
    { key: 'ppe', title: 'Personal Protective Equipment (PPE)', icon: Shield, severity: 'neutral' },
    { key: 'sif', title: 'Serious Injury/Fatality Prevention', icon: AlertTriangle, severity: 'stop' },
    { key: 'manual', title: 'Material Handling', icon: Wrench, severity: 'neutral' },
    { key: 'q', title: 'Discussion Questions', icon: HelpCircle, severity: 'neutral' },
  ];

  const citations = content.citations ?? [];
  const citationsForSection = (key: string): TalkCitation[] =>
    citations.filter((citation) => citation.sections?.includes(key));

  return (
    <div className="space-y-4">
      {/* Introduction */}
      <div className="border border-rule bg-sheet">
        <div className="flex items-center gap-2 border-b border-rule-soft px-4 py-3">
          <FileText className="text-ink-faint" size={16} />
          <span className="snd-label text-ink-muted">Introduction</span>
        </div>
        <div className="p-4">
          {isEditable ? (
            <AutoSizeTextarea
              aria-label="Introduction"
              value={content.i}
              onChange={(e) => updateContent('i', e.target.value)}
              className="w-full resize-none border border-rule bg-sheet p-3 text-[16px] leading-relaxed text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
              placeholder="1-2 sentences introducing the task and safety importance..."
            />
          ) : (
            <p className="leading-relaxed text-ink-body">{content.i}</p>
          )}
          <CitationBadges citations={citationsForSection('i')} />
        </div>
      </div>

      {/* Structured Sections */}
      {sections.map((section) => {
        const Icon = section.icon;
        const items = content[section.key] as string[];
        const { label, icon } = severityClasses[section.severity];

        return (
          <div key={section.key} className="border border-rule bg-sheet">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule-soft px-4 py-3">
              <span className={`snd-label flex items-center gap-2 ${label}`}>
                <Icon className={icon} size={16} />
                {section.title}
              </span>
              {isEditable && (
                <button
                  onClick={() => addArrayItem(section.key)}
                  aria-label={`Add ${section.title} item`}
                  className="snd-label min-h-11 shrink-0 px-2 text-accent hover:text-accent-hover"
                >
                  + Add item
                </button>
              )}
            </div>

            <div className="p-4">
              {items.length > 0 ? (
                <ul className="space-y-2">
                  {items.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-1 text-ink-faint">&bull;</span>
                      {isEditable ? (
                        <div className="flex min-w-0 flex-1 items-start gap-2">
                          <AutoSizeTextarea
                            aria-label={`${section.title} item ${index + 1}`}
                            value={item}
                            onChange={(e) => updateArrayItem(section.key, index, e.target.value)}
                            className="min-h-11 w-full min-w-0 flex-1 border border-rule bg-sheet p-2 text-[16px] leading-relaxed text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
                            placeholder="Add a specific safety action..."
                          />
                          <button
                            onClick={() => removeArrayItem(section.key, index)}
                            aria-label={`Remove ${section.title} item ${index + 1}`}
                            className="min-h-11 min-w-11 shrink-0 px-2 text-lg text-stop hover:text-stop-text"
                          >
                            &times;
                          </button>
                        </div>
                      ) : (
                        <span className="text-ink-body">{item}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink-faint">No items added yet</p>
              )}
              <CitationBadges citations={citationsForSection(section.key)} />
            </div>
          </div>
        );
      })}

      {/* Referenced OSHA standards + unofficial-text disclaimer */}
      {citations.length > 0 && (
        <div className="border border-rule bg-ground p-4">
          <div className="mb-2 flex items-center gap-2">
            <Scale className="text-ink-faint" size={16} />
            <span className="snd-label text-ink-muted">Referenced OSHA Standards</span>
          </div>
          <ul className="space-y-1">
            {citations.map((citation) => (
              <li key={citation.citation} className="text-sm text-ink-body">
                <a
                  href={citation.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                >
                  29 CFR {citation.citation}
                  <ExternalLink size={12} />
                </a>
                {citation.title || citation.subpart_title ? ` — ${citation.title || citation.subpart_title}` : ''}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-faint">
            OSHA standard text referenced here is unofficial. Verify against the official CFR on{' '}
            <a
              href="https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1926"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-muted underline hover:text-accent"
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
