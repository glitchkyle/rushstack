import React, { useCallback, useEffect, useState } from 'react';
import { readPnpmfile, readParsedCJS, readPackageJSON } from '../../parsing/getPackageFiles';
import styles from './styles.scss';
import appStyles from '../../appstyles.scss';
import { useAppSelector } from '../../store/hooks';
import { selectCurrentEntry } from '../../store/slices/entrySlice';
import { IPackageJson } from '../../types/IPackageJson';
import { compareSpec, ISpecChange } from '../../parsing/compareSpec';

enum PackageView {
  PACKAGE_JSON,
  CJS,
  PARSED_PACKAGE_JSON
}

export const PackageJsonViewer = (): JSX.Element => {
  const [packageJSON, setPackageJSON] = useState<IPackageJson | undefined>(undefined);
  const [parsedPackageJSON, setParsedPackageJSON] = useState<IPackageJson | undefined>(undefined);
  const [specChanges, setSpecChanges] = useState<Map<string, ISpecChange>>(new Map());
  const [cjs, setCjs] = useState('');
  const selectedEntry = useAppSelector(selectCurrentEntry);

  const [selection, setSelection] = useState<PackageView>(PackageView.PARSED_PACKAGE_JSON);

  const cb = useCallback((s: PackageView) => () => setSelection(s), []);

  useEffect(() => {
    async function loadPackageDetails(packageName: string): Promise<void> {
      const cjsFile = await readPnpmfile();
      setCjs(cjsFile);
      const packageJSONFile = await readPackageJSON(packageName);
      setPackageJSON(packageJSONFile);
      const parsedJSON = await readParsedCJS(packageName);
      setParsedPackageJSON(parsedJSON);

      if (packageJSONFile && parsedJSON) {
        const diffDeps = compareSpec(packageJSONFile, parsedJSON);
        console.log('diff deps: ', diffDeps);
        setSpecChanges(diffDeps);
      }
    }
    if (selectedEntry) {
      if (selectedEntry.entryPackageName) {
        /* eslint @typescript-eslint/no-floating-promises: off */
        loadPackageDetails(selectedEntry.packageJsonFolderPath);
      } else {
        console.log('selected entry has no entry name: ', selectedEntry.entryPackageName);
      }
    }
  }, [selectedEntry]);

  const renderDep = (dependencyDetails: [string, string]): JSX.Element => {
    const [dep, version] = dependencyDetails;
    if (specChanges.has(dep)) {
      switch (specChanges.get(dep)?.type) {
        case 'ADDED_DEP':
          return (
            <p key={dep}>
              <span className={styles.addedSpec}>
                {dep}: {version}
              </span>{' '}
              [Added by .pnpmfile.cjs]
            </p>
          );
        case 'DIFF_DEP':
          return (
            <p key={dep}>
              <span className={styles.changedSpec}>
                {dep}: {version}
              </span>{' '}
              [Changed from {specChanges.get(dep)?.from}]
            </p>
          );
        case 'DELETED_DEP':
          return (
            <p key={dep}>
              <span className={styles.deletedSpec}>
                {dep}: {version}
              </span>{' '}
              [Deleted by .pnpmfile.cjs]
            </p>
          );
        default:
          return (
            <p key={dep}>
              {dep}: {version}
            </p>
          );
      }
    } else {
      return (
        <p key={dep}>
          {dep}: {version}
        </p>
      );
    }
  };

  const renderFile = (): JSX.Element | null => {
    switch (selection) {
      case PackageView.PACKAGE_JSON:
        if (!packageJSON) return null;
        return <pre>{JSON.stringify(packageJSON, null, 2)}</pre>;
      case PackageView.CJS:
        return <pre>{cjs}</pre>;
      case PackageView.PARSED_PACKAGE_JSON:
        if (!parsedPackageJSON) return null;
        return (
          <div className={styles.packageSpecWrapper}>
            <h5>Dependencies</h5>
            {parsedPackageJSON.dependencies && Object.entries(parsedPackageJSON.dependencies).map(renderDep)}
            <h5>Dev Dependencies</h5>
            {parsedPackageJSON.devDependencies &&
              Object.entries(parsedPackageJSON.devDependencies).map(renderDep)}
            <h5>Peer Dependencies</h5>
            {parsedPackageJSON.peerDependencies &&
              Object.entries(parsedPackageJSON.peerDependencies).map(renderDep)}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className={styles.headerFilterBar}>
        <div
          className={`${styles.headerFilterItem} ${
            selection === PackageView.PARSED_PACKAGE_JSON ? styles.headerFilterItemActive : ''
          }`}
          onClick={cb(PackageView.PARSED_PACKAGE_JSON)}
        >
          package spec
        </div>
        <div
          className={`${styles.headerFilterItem} ${
            selection === PackageView.PACKAGE_JSON ? styles.headerFilterItemActive : ''
          }`}
          onClick={cb(PackageView.PACKAGE_JSON)}
        >
          package.json
        </div>
        <div
          className={`${styles.headerFilterItem} ${
            selection === PackageView.CJS ? styles.headerFilterItemActive : ''
          }`}
          onClick={cb(PackageView.CJS)}
        >
          .pnpmfile.cjs
        </div>
      </div>
      <div className={appStyles.containerCard}>
        <div className={styles.fileContents}>{renderFile()}</div>
      </div>
    </div>
  );
};
