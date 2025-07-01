The file has several missing closing brackets. Here's the corrected version with the added closing brackets:

1. In the workers section, there's a missing closing `div` and some misplaced attributes:

```jsx
{workers.length === 0 && (
  <div className="text-center text-gray-500 py-2">
    No workers added yet
  </div>
)}
</div> {/* Close the workers border div */}

{/* Move these misplaced attributes into a proper button */}
<button 
  type="submit"
  form="task-form"
  disabled={!canSubmit}
  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
>
  Submit
</button>
```

2. At the end of the file, add the missing closing curly brace and parenthesis for the component:

```jsx
  );
};

export default TaskModal;
```

The complete file should now be properly closed with all matching brackets and parentheses.