import Icon from './Icon.jsx';
export default function Notice({ children, error = false }) {
  return (
    <div
      className={`notice ${error ? 'notice-error' : ''}`}
      role={error ? 'alert' : undefined}
    >
      <Icon name="info" />
      <div>{children}</div>
    </div>
  );
}
