function CategoryFilter({ categories, selectedCategory, onSelect }) {
  return (
    <div className="category-filter">
      <button
        className={`category-btn ${selectedCategory === null ? 'active' : ''}`}
        onClick={() => onSelect(null)}
      >
        Все товары
      </button>
      {categories.map(category => (
        <button
          key={category.id}
          className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
          onClick={() => onSelect(category.id)}
        >
          {category.icon} {category.name}
        </button>
      ))}
    </div>
  );
}

export default CategoryFilter;
