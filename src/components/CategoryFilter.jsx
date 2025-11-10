// CATEGORY FILTER COMPONENT
// Displays buttons or dropdown to filter by category
function CategoryFilter({ categories, selectedCategory, onCategoryChange }) {
  return (
    <div className="category-filter">
      <button
        className={selectedCategory === 'all' ? 'category-btn active' : 'category-btn'}
        onClick={() => onCategoryChange('all')}
      >
        All Questions
      </button>
      {categories.map(category => (
        <button
          key={category.id}
          className={selectedCategory === category.id.toString() ? 'category-btn active' : 'category-btn'}
          onClick={() => onCategoryChange(category.id.toString())}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}

export default CategoryFilter
