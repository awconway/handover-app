interface ISBARSegment {
  quote: string;
  label: 'IDENTIFICATION' | 'SITUATION' | 'BACKGROUND' | 'ASSESSMENT' | 'RECOMMENDATION';
}

interface ISBARHighlighterProps {
  transcript: string;
  isbarData: ISBARSegment[];
}

const ISBARHighlighter: React.FC<ISBARHighlighterProps> = ({ transcript, isbarData }) => {
  const categoryColors = {
    IDENTIFICATION: { bg: 'decoration-blue-600', label: 'bg-blue-600' },
    SITUATION: { bg: 'decoration-green-600', label: 'bg-green-600' },
    BACKGROUND: { bg: 'decoration-yellow-600', label: 'bg-yellow-600' },
    ASSESSMENT: { bg: 'decoration-purple-600', label: 'bg-purple-600' },
    RECOMMENDATION: { bg: 'decoration-pink-600', label: 'bg-pink-600' },
  };

  const findQuotePosition = (transcript: string, quote: string) => {
    const exactPos = transcript.indexOf(quote);
    return exactPos !== -1 ? { start: exactPos, end: exactPos + quote.length } : null;
  };

  const createHighlightedText = () => {
    if (!transcript || !isbarData.length) {
      return <span>No transcript or ISBAR data available</span>;
    }

    let result = [];
    let currentPos = 0;
    let segments: Array<{ start: number; end: number; label: string; quote: string } > = [];

    isbarData.forEach(({ quote, label }) => {
      const position = findQuotePosition(transcript, quote);
      if (position) {
        segments.push({ start: position.start, end: position.end, label, quote });
      }
    });

    segments.sort((a, b) => a.start - b.start);
    segments = segments.filter((segment, index) => index === 0 || segment.start >= segments[index - 1].end);

    segments.forEach((segment) => {
      if (segment.start > currentPos) {
        result.push(
          <span key={`plain-${currentPos}`}>{transcript.slice(currentPos, segment.start)}</span>
        );
      }

      result.push(
        <>
          <span
            key={`highlight-${segment.start}`}
            className={`underline underline-offset-2 ${categoryColors[segment.label as keyof typeof categoryColors].bg}`}
          >
            {transcript.slice(segment.start, segment.end)}
          </span>
          &nbsp;
          <span
            className={`font-bold uppercase text-xs text-white rounded-sm px-1 py-0.5 ${categoryColors[segment.label as keyof typeof categoryColors].label}`}
          >
            {segment.label}
          </span>
        </>
      );
      currentPos = segment.end;
    });

    if (currentPos < transcript.length) {
      result.push(<span key={`plain-${currentPos}`}>{transcript.slice(currentPos)}</span>);
    }

    return result;
  };

  return <>{createHighlightedText()}</>;
};

export default ISBARHighlighter;