import './ChecksList.css'

function ChecksList({ checks, activeCheckId, onCheckChange, onCreateNew }) {
  return (
    <div className="top__checks">
      <div className="checks" id="checks">
        {checks.map((check) => (
          <div key={check.id} className="check-item">
            <input
              type="radio"
              id={`check-${check.id}`}
              name="check"
              value={check.id}
              checked={check.id === activeCheckId}
              onChange={(e) => onCheckChange(parseInt(e.target.value, 10))}
            />
            <label htmlFor={`check-${check.id}`}>{check.id}</label>
          </div>
        ))}
      </div>
      <button className="newCheck" onClick={onCreateNew} aria-label="Новый чек">
        +
      </button>
    </div>
  )
}

export default ChecksList

