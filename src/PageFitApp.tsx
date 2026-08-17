import { useEffect, useMemo, useRef, useState } from 'react';
import { CvDocument } from './components/CvDocument';
import { mergeCvVersion } from './lib/mergeCvVersion';
import { measureCvPageFit, type CvPageFitMeasurement } from './lib/printCv';
import type { CvLibrary, CvMaster, CvVersion } from './types/cv';
import './components/CvDocument.css';

export type CvPageFitProbeResult = CvPageFitMeasurement & {
  ready: boolean;
  versionId: string;
  error?: string;
};

declare global {
  interface Window {
    __CV_PAGE_FIT__?: CvPageFitProbeResult;
  }
}

type PageFitAppProps = {
  versionId: string;
};

async function loadCvData(): Promise<{ master: CvMaster; library: CvLibrary }> {
  const [masterResponse, libraryResponse] = await Promise.all([
    fetch('/api/cv/master'),
    fetch('/api/cv/library'),
  ]);

  if (!masterResponse.ok) {
    throw new Error('master.yaml not found (run npm run setup).');
  }

  if (!libraryResponse.ok) {
    throw new Error('Could not load CV library.');
  }

  const master = (await masterResponse.json()) as CvMaster;
  const library = (await libraryResponse.json()) as CvLibrary;

  return { master, library };
}

function findVersion(library: CvLibrary, versionId: string): CvVersion | undefined {
  return (
    library.bases.find((entry) => entry.id === versionId)
    ?? library.saved.find((entry) => entry.id === versionId)
  );
}

export const PageFitApp = ({ versionId }: PageFitAppProps) => {
  const pageRef = useRef<HTMLElement>(null);
  const [master, setMaster] = useState<CvMaster | null>(null);
  const [version, setVersion] = useState<CvVersion | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void loadCvData()
      .then(({ master: nextMaster, library }) => {
        if (cancelled) {
          return;
        }

        const nextVersion = findVersion(library, versionId);

        if (!nextVersion) {
          setLoadError(`CV version not found: ${versionId}`);
          return;
        }

        setMaster(nextMaster);
        setVersion(nextVersion);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Failed to load CV data.';
        setLoadError(message);
      });

    return () => {
      cancelled = true;
    };
  }, [versionId]);

  const resolvedCv = useMemo(() => {
    if (!master || !version) {
      return null;
    }

    return mergeCvVersion(master, version);
  }, [master, version]);

  useEffect(() => {
    if (loadError) {
      window.__CV_PAGE_FIT__ = {
        ready: true,
        versionId,
        overflows: false,
        clientHeight: 0,
        scrollHeight: 0,
        overflowPx: 0,
        sparePx: 0,
        error: loadError,
      };
      return;
    }

    if (!resolvedCv) {
      window.__CV_PAGE_FIT__ = {
        ready: false,
        versionId,
        overflows: false,
        clientHeight: 0,
        scrollHeight: 0,
        overflowPx: 0,
        sparePx: 0,
      };
      return;
    }

    const pageElement = pageRef.current;

    if (!pageElement) {
      return;
    }

    let cancelled = false;
    let fontsReady = false;

    const publish = (markReady: boolean) => {
      if (cancelled) {
        return;
      }

      const measurement = measureCvPageFit(pageElement);
      window.__CV_PAGE_FIT__ = {
        ready: markReady,
        versionId,
        ...measurement,
      };
    };

    // Keep ready=false until fonts settle so check-page-fit does not snapshot early.
    publish(false);

    const measureWhenReady = async () => {
      await document.fonts.ready;

      if (cancelled) {
        return;
      }

      fontsReady = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          publish(true);
        });
      });
    };

    void measureWhenReady();

    const observer = new ResizeObserver(() => {
      publish(fontsReady);
    });
    observer.observe(pageElement);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [loadError, resolvedCv, versionId]);

  if (loadError) {
    return <p>{loadError}</p>;
  }

  if (!resolvedCv) {
    return null;
  }

  return (
    <CvDocument
      cv={resolvedCv}
      pageRef={pageRef}
    />
  );
};
