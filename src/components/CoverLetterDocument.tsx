import './CoverLetterDocument.css';

type CoverLetterDocumentProps = {
  text: string;
};

export const CoverLetterDocument = ({
  text,
}: CoverLetterDocumentProps) => {
  return (
    <article className="cover-letter-page">
      <pre className="cover-letter-body">{text}</pre>
    </article>
  );
};
