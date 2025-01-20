interface ISBARSegment {
  quote: string;
}

interface ISBARCategory {
  segments: ISBARSegment[];
}

interface ISBARData {
  Identification?: ISBARCategory;
  Situation?: ISBARCategory;
  Background?: ISBARCategory;
  Assessment?: ISBARCategory;
  Recommendation?: ISBARCategory;
}

interface ISBARHighlighterProps {
  transcript: string;
  isbarData: ISBARData;
}

const ISBARHighlighter: React.FC<ISBARHighlighterProps> = ({ transcript, isbarData }) => {

  const categoryColors = {
    Identification: {
      bg: 'decoration-blue-600',
      label: 'bg-blue-600'
    },
    Situation: {
      bg: 'decoration-green-600',
      label: 'bg-green-600'
    },
    Background: {
      bg: 'decoration-yellow-600',
      label: 'bg-yellow-600'
    },
    Assessment: {
      bg: 'decoration-purple-600',
      label: 'bg-purple-600'
    },
    Recommendation: {
      bg: 'decoration-pink-600',
      label: 'bg-pink-600'
    },
  };

  // const categoryColors = {
  //   Identification: {
  //     bg: 'bg-blue-100',
  //     label: 'bg-blue-600'
  //   },
  //   Situation: {
  //     bg: 'bg-green-100',
  //     label: 'bg-green-600'
  //   },
  //   Background: {
  //     bg: 'bg-yellow-100',
  //     label: 'bg-yellow-600'
  //   },
  //   Assessment: {
  //     bg: 'bg-purple-100',
  //     label: 'bg-purple-600'
  //   },
  //   Recommendation: {
  //     bg: 'bg-pink-100',
  //     label: 'bg-pink-600'
  //   },
  // };



  const findQuotePosition = (transcript: string, quote: string) => {
    const exactPos = transcript.indexOf(quote);
    if (exactPos !== -1) {
      return {
        start: exactPos,
        end: exactPos + quote.length
      };
    }
    return null;
  };

  const createHighlightedText = () => {
    if (!transcript || !isbarData) {
      return <span>No transcript or ISBAR data available</span>;
    }

    let result = [];
    let currentPos = 0;
    let segments: Array<{
      start: number;
      end: number;
      category: string;
      data: ISBARSegment;
    }> = [];

    Object.entries(isbarData).forEach(([category, categoryData]) => {
      if (categoryData?.segments) {
        categoryData.segments.forEach((segment) => {
          if (segment?.quote) {
            const position = findQuotePosition(transcript, segment.quote, category);
            if (position) {
              segments.push({
                start: position.start,
                end: position.end,
                category,
                data: segment
              });
            }
          }
        });
      }
    });

    segments.sort((a, b) => a.start - b.start);
    segments = segments.filter((segment, index) => {
      if (index === 0) return true;
      return segment.start >= segments[index - 1].end;
    });

    segments.forEach((segment) => {
      if (segment.start > currentPos) {
        result.push(
          <span key={`plain-${currentPos}`}>
            {transcript.slice(currentPos, segment.start)}
          </span>
        );
      }

      result.push(
        <>
        <span
          key={`highlight-${segment.start}`}
          className={`underline underline-offset-2 ${categoryColors[segment.category as keyof typeof categoryColors].bg}`}
          >
          <span>{transcript.slice(segment.start, segment.end)}</span>
        </span>
          &nbsp;
          <span className={`font-bold uppercase text-xs text-white rounded-sm px-1 py-0.5 ${categoryColors[segment.category as keyof typeof categoryColors].label}`}>
            {segment.category}
          </span>
          </>
        // <span
        //   key={`highlight-${segment.start}`}
        //   className={`rounded-sm px-1 py-1 ${categoryColors[segment.category as keyof typeof categoryColors].bg}`}
        // >
        //   <span>{transcript.slice(segment.start, segment.end)}</span>
        //   &nbsp;
        //   <span className={`font-bold uppercase text-xs text-white rounded-sm px-1 py-0.5 ${categoryColors[segment.category as keyof typeof categoryColors].label}`}>
        //     {segment.category}
        //   </span>
        // </span>
      );
      currentPos = segment.end;
    });

    if (currentPos < transcript.length) {
      result.push(
        <span key={`plain-${currentPos}`}>
          {transcript.slice(currentPos)}
        </span>
      );
    }

    return result;
  };

  return (
    <>
        {createHighlightedText()}
    </>
  );
};

export default ISBARHighlighter;