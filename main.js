const canvas = new fabric.Canvas('canvas');
let inputValues = {};
const inputElements = [];

async function sendPrompt() {
  const promptElement = document.getElementById('prompt');
  if (!promptElement) {
    console.error("Error: Could not find element with ID 'prompt'. Ensure the HTML has an input with id='prompt'.");
    return;
  }
  const prompt = promptElement.value;
  const res = await fetch('https://gen-ui-backend.vercel.app/api/generate-ui', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  const data = await res.json();
  if (data.error) {
    console.error('Backend error:', data.error, data.details);
    alert('Failed to generate UI: ' + (data.details || data.error));
    return;
  }
  if (!data.layout) {
    console.error('No layout in response:', data);
    alert('No layout received from backend');
    return;
  }
  renderLayout(data.layout);
}

function renderLayout(layout) {
  // Clear previous layout
  canvas.clear();
  inputValues = {};
  inputElements.forEach(input => input.remove());
  inputElements.length = 0;

  if (!layout || !layout.components) {
    console.error('Invalid layout received:', layout);
    alert('Invalid layout received from backend');
    return;
  }

  layout.components.forEach(comp => {
    const { type, props = {} } = comp;
    const { position = { x: 100, y: 100 }, style = {} } = props;

    if (type === 'button') {
      const rect = new fabric.Rect({
        left: position.x,
        top: position.y,
        fill: style.backgroundColor || '#333',
        width: 120,
        height: 40,
        rx: 5,
        ry: 5,
        selectable: false
      });
      const text = new fabric.Text(props.text || 'Button', {
        left: position.x + 10,
        top: position.y + 10,
        fontSize: style.fontSize || 16,
        fill: style.color || '#fff',
        selectable: false
      });
      rect.on('mouse:down', () => {
        const inputData = Object.entries(inputValues)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
        alert(`Clicked "${props.text}" button!\n${inputData || 'No inputs available.'}`);
      });
      canvas.add(rect, text);
    }

    if (type === 'text') {
      const text = new fabric.Text(props.text || 'Sample Text', {
        left: position.x,
        top: position.y,
        fontSize: style.fontSize || 18,
        fill: style.color || '#000',
        selectable: false
      });
      canvas.add(text);
    }

    if (type === 'image') {
      fabric.Image.fromURL(props.src || '', function(img) {
        img.set({ left: position.x, top: position.y, scaleX: 0.3, scaleY: 0.3, selectable: false });
        canvas.add(img);
      });
    }

    if (type === 'input') {
      const rect = new fabric.Rect({
        left: position.x,
        top: position.y,
        fill: '#fff',
        width: 200,
        height: 30,
        stroke: '#ccc',
        strokeWidth: 1,
        selectable: false
      });
      const placeholderText = props.placeholder || 'Enter text';
      const text = new fabric.Text(placeholderText, {
        left: position.x + 10,
        top: position.y + 7,
        fontSize: 14,
        fill: '#888',
        selectable: false
      });
      canvas.add(rect, text);

      const htmlInput = document.createElement('input');
      htmlInput.type = 'text';
      htmlInput.placeholder = placeholderText;
      htmlInput.tabIndex = 0; // Make the input focusable via tab
      htmlInput.style.position = 'absolute';
      // Get the canvas's position relative to the viewport, accounting for scrolling
      const canvasElement = canvas.getElement();
      const canvasRect = canvasElement.getBoundingClientRect();
      const zoom = canvas.getZoom() || 1;
      // Adjust position to account for scroll offsets
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      const inputLeft = canvasRect.left + scrollX + (position.x + 10) * zoom;
      const inputTop = canvasRect.top + scrollY + (position.y + 7) * zoom;
      htmlInput.style.left = `${inputLeft}px`;
      htmlInput.style.top = `${inputTop}px`;
      htmlInput.style.width = '180px';
      htmlInput.style.height = '20px';
      htmlInput.style.padding = '5px';
      htmlInput.style.border = '1px solid #ccc';
      htmlInput.style.borderRadius = '4px';
      htmlInput.style.fontSize = '14px';
      htmlInput.style.zIndex = '1000';
      htmlInput.style.boxSizing = 'border-box'; // Ensure padding doesn't affect size
      document.body.appendChild(htmlInput);
      inputElements.push(htmlInput);

      // Debug: Log the input's position and visibility
      console.log(`Input created for "${placeholderText}":`, {
        left: htmlInput.style.left,
        top: htmlInput.style.top,
        display: htmlInput.style.display || 'default',
        visibility: htmlInput.style.visibility || 'default',
        zIndex: htmlInput.style.zIndex
      });

      // Allow focusing the input when clicking the canvas rectangle
      rect.on('mousedown', (e) => {
        e.e.preventDefault(); // Prevent canvas from capturing the event
        htmlInput.focus();
      });

      inputValues[placeholderText] = '';
      htmlInput.addEventListener('input', (e) => {
        const value = e.target.value;
        text.set('text', value || placeholderText);
        text.set('fill', value ? '#000' : '#888');
        inputValues[placeholderText] = value;
        canvas.renderAll();
      });

      // Handle window resize or scroll to reposition the input
      const updatePosition = () => {
        const newCanvasRect = canvasElement.getBoundingClientRect();
        const newScrollX = window.scrollX || window.pageXOffset;
        const newScrollY = window.scrollY || window.pageYOffset;
        htmlInput.style.left = `${newCanvasRect.left + newScrollX + (position.x + 10) * zoom}px`;
        htmlInput.style.top = `${newCanvasRect.top + newScrollY + (position.y + 7) * zoom}px`;
      };
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
    }
  });
}