export default function Filters({
  platform,
  availability,
  query,
  platformOptions,
  availabilityOptions,
  onPlatformChange,
  onAvailabilityChange,
  onQueryChange,
}) {
  return (
    <section className="filters">
      <label>
        Platform
        <select value={platform} onChange={onPlatformChange}>
          {platformOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label>
        Availability
        <select value={availability} onChange={onAvailabilityChange}>
          {availabilityOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
