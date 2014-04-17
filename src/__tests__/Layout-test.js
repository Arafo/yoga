

var iframe = (function() {
  var iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  var doc = iframe.contentDocument;

  var style = document.createElement('style');
  style.innerText = (function() {/*
    body, div {
      box-sizing: border-box;
      position: relative;

      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-start;
      flex-shrink: 0;

      margin: 0;
      padding: 0;
    }
  */} + '').slice(15, -4);
  doc.head.appendChild(style);

  return iframe;
})();

function computeDOMLayout(node) {
  var body = iframe.contentDocument.body;

  function transfer(div, node, name, ext) {
    if (name in node.style) {
      div.style[name] = node.style[name] + (ext || '');
    }
  }

  function transferSpacing(div, node, type) {
    transfer(div, node, type, 'px');
    transfer(div, node, type + 'Left', 'px');
    transfer(div, node, type + 'Top', 'px');
    transfer(div, node, type + 'Bottom', 'px');
    transfer(div, node, type + 'Right', 'px');
  }

  function renderNode(parent, node) {
    var div = document.createElement('div');
    transfer(div, node, 'width', 'px');
    transfer(div, node, 'height', 'px');
    transfer(div, node, 'top', 'px');
    transfer(div, node, 'left', 'px');
    transfer(div, node, 'right', 'px');
    transfer(div, node, 'bottom', 'px');
    transferSpacing(div, node, 'margin');
    transferSpacing(div, node, 'padding');
    transfer(div, node, 'flexDirection');
    transfer(div, node, 'flex');
    transfer(div, node, 'justifyContent');
    transfer(div, node, 'alignSelf');
    transfer(div, node, 'alignItems');
    transfer(div, node, 'position');
    parent.appendChild(div);
    (node.children || []).forEach(function(child) {
      renderNode(div, child);
    });
    return div;
  }

  var div = renderNode(body, node);

  function buildLayout(absoluteRect, div) {
    var rect = div.getBoundingClientRect();
    var result = {
      width: rect.width,
      height: rect.height,
      top: rect.top - absoluteRect.top,
      left: rect.left - absoluteRect.left
    };

    var children = [];
    for (var child = div.firstChild; child; child = child.nextSibling) {
      children.push(buildLayout(rect, child));
    }
    if (children.length) {
      result.children = children;
    }
    return result;
  }
  var layout = buildLayout({left: 0, top: 0}, div);
  body.removeChild(div);
  return layout;
}

function nameLayout(name, layout) {
  var namedLayout = {name: name};
  for (var key in layout) {
    namedLayout[key] = layout[key];
  }
  return namedLayout;
}

function testNamedLayout(name, layoutA, layoutB) {
  expect(nameLayout(name, layoutA))
    .toEqual(nameLayout(name, layoutB));
}

function testLayout(node, expectedLayout) {
  var layout = computeLayout(node);
  var domLayout = computeDOMLayout(node);
  testNamedLayout('expected-dom', expectedLayout, domLayout);
  testNamedLayout('layout-dom', layout, domLayout);
}

describe('Layout', function() {
  it('should layout a single node with width and height', function() {
    testLayout({
      style: {width: 100, height: 200}
    }, {
      width: 100, height: 200, top: 0, left: 0
    });
  });

  it('should layout node with children', function() {
    testLayout(
      {style: {width: 1000, height: 1000}, children: [
        {style: {width: 500, height: 500}},
        {style: {width: 250, height: 250}},
        {style: {width: 125, height: 125}}
      ]},
      {width: 1000, height: 1000, top: 0, left: 0, children: [
        {width: 500, height: 500, top: 0, left: 0},
        {width: 250, height: 250, top: 500, left: 0},
        {width: 125, height: 125, top: 750, left: 0}
      ]}
    );
  });

  it('should layout node with nested children', function() {
    testLayout(
      {style: {width: 1000, height: 1000}, children: [
        {style: {width: 500, height: 500}},
        {style: {width: 500, height: 500}, children: [
          {style: {width: 250, height: 250}},
          {style: {width: 250, height: 250}}
        ]}
      ]},
      {width: 1000, height: 1000, top: 0, left: 0, children: [
        {width: 500, height: 500, top: 0, left: 0},
        {width: 500, height: 500, top: 500, left: 0, children: [
          {width: 250, height: 250, top: 0, left: 0},
          {width: 250, height: 250, top: 250, left: 0},
        ]}
      ]}
    );
  });

  it('should layout node with margin', function() {
    testLayout(
      {style: {width: 100, height: 200, margin: 10}},
      {width: 100, height: 200, top: 10, left: 10}
    );
  });

  it('should layout node with several children', function() {
    testLayout(
      {style: {width: 1000, height: 1000, margin: 10}, children: [
        {style: {width: 100, height: 100, margin: 50}},
        {style: {width: 100, height: 100, margin: 25}},
        {style: {width: 100, height: 100, margin: 10}}
      ]},
      {width: 1000, height: 1000, top: 10, left: 10, children: [
        {width: 100, height: 100, top: 50, left: 50},
        {width: 100, height: 100, top: 225, left: 25},
        {width: 100, height: 100, top: 360, left: 10}
      ]}
    );
  });

  it('should layout node with row flex direction', function() {
    testLayout(
      {style: {width: 1000, height: 1000, flexDirection: 'row'}, children: [
        {style: {width: 100, height: 200}},
        {style: {width: 300, height: 150}}
      ]},
      {width: 1000, height: 1000, top: 0, left: 0, children: [
        {width: 100, height: 200, top: 0, left: 0},
        {width: 300, height: 150, top: 0, left: 100}
      ]}
    );
  });

  it('should layout node based on children main dimensions', function() {
    testLayout(
      {style: {width: 300}, children: [
        {style: {width: 100, height: 200}},
        {style: {width: 300, height: 150}}
      ]},
      {width: 300, height: 350, top: 0, left: 0, children: [
        {width: 100, height: 200, top: 0, left: 0},
        {width: 300, height: 150, top: 200, left: 0}
      ]}
    );
  });

  it('should layout node with flex', function() {
    testLayout(
      {style: {width: 1000, height: 1000}, children: [
        {style: {width: 100, height: 200}},
        {style: {width: 100, flex: 1}}
      ]},
      {width: 1000, height: 1000, top: 0, left: 0, children: [
        {width: 100, height: 200, top: 0, left: 0},
        {width: 100, height: 800, top: 200, left: 0}
      ]}
    );
  });

  it('should layout node with flex recursively', function() {
    testLayout(
      {style: {width: 1000, height: 1000}, children: [
        {style: {width: 1000, flex: 1}, children: [
          {style: {width: 1000, flex: 1}, children: [
            {style: {width: 1000, flex: 1}}
          ]}
        ]}
      ]},
      {width: 1000, height: 1000, top: 0, left: 0, children: [
        {width: 1000, height: 1000, top: 0, left: 0, children: [
          {width: 1000, height: 1000, top: 0, left: 0, children: [
            {width: 1000, height: 1000, top: 0, left: 0}
          ]}
        ]}
      ]}
    );
  });

  it('should layout node with targeted margin', function() {
    testLayout(
      {style: {width: 1000, height: 1000, marginTop: 10, marginLeft: 5}, children: [
        {style: {width: 100, height: 100, marginTop: 50, marginLeft: 15, marginBottom: 20}},
        {style: {width: 100, height: 100, marginLeft: 30}}
      ]},
      {width: 1000, height: 1000, top: 10, left: 5, children: [
        {width: 100, height: 100, top: 50, left: 15},
        {width: 100, height: 100, top: 170, left: 30}
      ]}
    );
  });

  it('should layout node with justifyContent: flex-start', function() {
    testLayout(
      {style: {width: 1000, height: 1000, justifyContent: 'flex-start'}, children: [
        {style: {width: 100, height: 100}},
        {style: {width: 100, height: 100}}
      ]},
      {width: 1000, height: 1000, top: 0, left: 0, children: [
        {width: 100, height: 100, top: 0, left: 0},
        {width: 100, height: 100, top: 100, left: 0}
      ]}
    );
  });

  it('should layout node with justifyContent: flex-end', function() {
    testLayout(
      {style: {width: 1000, height: 1000, justifyContent: 'flex-end'}, children: [
        {style: {width: 100, height: 100}},
        {style: {width: 100, height: 100}}
      ]},
      {width: 1000, height: 1000, top: 0, left: 0, children: [
        {width: 100, height: 100, top: 800, left: 0},
        {width: 100, height: 100, top: 900, left: 0}
      ]}
    );
  });

  it('should layout node with justifyContent: space-between', function() {
    testLayout(
      {style: {width: 1000, height: 1000, justifyContent: 'space-between'}, children: [
        {style: {width: 100, height: 100}},
        {style: {width: 100, height: 100}}
      ]},
      {width: 1000, height: 1000, top: 0, left: 0, children: [
        {width: 100, height: 100, top: 0, left: 0},
        {width: 100, height: 100, top: 900, left: 0}
      ]}
    );
  });

  it('should layout node with justifyContent: space-around', function() {
    testLayout(
      {style: {width: 1000, height: 1000, justifyContent: 'space-around'}, children: [
        {style: {width: 100, height: 100}},
        {style: {width: 100, height: 100}}
      ]},
      {width: 1000, height: 1000, top: 0, left: 0, children: [
        {width: 100, height: 100, top: 200, left: 0},
        {width: 100, height: 100, top: 700, left: 0}
      ]}
    );
  });

  it('should layout node with justifyContent: center', function() {
    testLayout(
      {style: {width: 1000, height: 1000, justifyContent: 'center'}, children: [
        {style: {width: 100, height: 100}},
        {style: {width: 100, height: 100}}
      ]},
      {width: 1000, height: 1000, top: 0, left: 0, children: [
        {width: 100, height: 100, top: 400, left: 0},
        {width: 100, height: 100, top: 500, left: 0}
      ]}
    );
  });

  it('should layout node with flex override height', function() {
    testLayout(
      {style: {width: 1000, height: 1000}, children: [
        {style: {width: 100, height: 100, flex: 1}},
      ]},
      {width: 1000, height: 1000, top: 0, left: 0, children: [
        {width: 100, height: 1000, top: 0, left: 0}
      ]}
    );
  });

  it('should layout node with alignItems: flex-start', function() {
    testLayout(
      {style: {width: 1000, height: 1000, alignItems: 'flex-start'}, children: [
        {style: {width: 200, height: 100}},
        {style: {width: 100, height: 100}}
      ]},
      {width: 1000, height: 1000, top: 0, left: 0, children: [
        {width: 200, height: 100, top: 0, left: 0},
        {width: 100, height: 100, top: 100, left: 0},
      ]}
    );
  });

  it('should layout node with alignItems: center', function() {
    testLayout(
      {style: {width: 1000, height: 1000, alignItems: 'center'}, children: [
        {style: {width: 200, height: 100}},
        {style: {width: 100, height: 100}}
      ]},
      {width: 1000, height: 1000, top: 0, left: 0, children: [
        {width: 200, height: 100, top: 0, left: 400},
        {width: 100, height: 100, top: 100, left: 450},
      ]}
    );
  });

  it('should layout node with alignItems: flex-end', function() {
    testLayout(
      {style: {width: 1000, height: 1000, alignItems: 'flex-end'}, children: [
        {style: {width: 200, height: 100}},
        {style: {width: 100, height: 100}}
      ]},
      {width: 1000, height: 1000, top: 0, left: 0, children: [
        {width: 200, height: 100, top: 0, left: 800},
        {width: 100, height: 100, top: 100, left: 900},
      ]}
    );
  });

  it('should layout node with alignSelf overrides alignItems', function() {
    testLayout(
      {style: {width: 1000, height: 1000, alignItems: 'flex-end'}, children: [
        {style: {width: 200, height: 100}},
        {style: {width: 100, height: 100, alignSelf: 'center'}}
      ]},
      {width: 1000, height: 1000, top: 0, left: 0, children: [
        {width: 200, height: 100, top: 0, left: 800},
        {width: 100, height: 100, top: 100, left: 450},
      ]}
    );
  });

  it('should layout node with alignItem: stretch', function() {
    testLayout(
      {style: {width: 1000, height: 1000, alignItems: 'stretch'}, children: [
        {style: {height: 100}}
      ]},
      {width: 1000, height: 1000, top: 0, left: 0, children: [
        {width: 1000, height: 100, top: 0, left: 0}
      ]}
    );
  });

  it('should layout empty node', function() {
    testLayout(
      {style: {}, children: [
        {style: {}}
      ]},
      {width: 0, height: 0, top: 0, left: 0, children: [
        {width: 0, height: 0, top: 0, left: 0}
      ]}
    );
  });

  it('should layout child with margin', function() {
    testLayout(
      {style: {}, children: [
        {style: {margin: 5}}
      ]},
      {width: 10, height: 10, top: 0, left: 0, children: [
        {width: 0, height: 0, top: 5, left: 5}
      ]}
    );
  });

  it('should not shrink children if not enough space', function() {
    testLayout(
      {style: {height: 100}, children: [
        {style: {height: 100}},
        {style: {height: 200}},
      ]},
      {width: 0, height: 100, top: 0, left: 0, children: [
        {width: 0, height: 100, top: 0, left: 0},
        {width: 0, height: 200, top: 100, left: 0}
      ]}
    );
  });

  it('should layout for center', function() {
    testLayout(
      {style: {justifyContent: 'center'}},
      {width: 0, height: 0, top: 0, left: 0}
    );
  });

  it('should layout flex-end taking into account margin', function() {
    testLayout(
      {style: {height: 100, justifyContent: 'flex-end'}, children: [
        {style: {marginTop: 10}}
      ]},
      {width: 0, height: 100, top: 0, left: 0, children: [
        {width: 0, height: 0, top: 100, left: 0}
      ]}
    );
  });

  it('should layout alignItems with margin', function() {
    testLayout(
      {style: {}, children: [
        {style: {alignItems: 'flex-end'}, children: [
          {style: {margin: 10}},
          {style: {height: 100}}
        ]}
      ]},
      {width: 20, height: 120, top: 0, left: 0, children: [
        {width: 20, height: 120, top: 0, left: 0, children: [
          {width: 0, height: 0, top: 10, left: 10},
          {width: 0, height: 100, top: 20, left: 20}
        ]}
      ]}
    );
  });

  it('should layout flex inside of an empty element', function() {
    testLayout(
      {style: {}, children: [
        {style: {flex: 1}},
      ]},
      {width: 0, height: 0, top: 0, left: 0, children: [
        {width: 0, height: 0, top: 0, left: 0}
      ]}
    );
  });

  it('should layout alignItems stretch and margin', function() {
    testLayout(
      {style: {alignItems: 'stretch'}, children: [
        {style: {marginLeft: 10}}
      ]},
      {width: 10, height: 0, top: 0, left: 0, children: [
        {width: 0, height: 0, top: 0, left: 10}
      ]}
    );
  });

  it('should layout node with padding', function() {
    testLayout(
      {style: {padding: 5}},
      {width: 10, height: 10, top: 0, left: 0}
    );
  });

  it('should layout node with padding and a child', function() {
    testLayout(
      {style: {padding: 5}, children: [
        {style: {}}
      ]},
      {width: 10, height: 10, top: 0, left: 0, children: [
        {width: 0, height: 0, top: 5, left: 5}
      ]}
    );
  });

  it('should layout node with padding and a child with margin', function() {
    testLayout(
      {style: {padding: 5}, children: [
        {style: {margin: 5}}
      ]},
      {width: 20, height: 20, top: 0, left: 0, children: [
        {width: 0, height: 0, top: 10, left: 10}
      ]}
    );
  });

  it('should layout node with padding and stretch', function() {
    testLayout(
      {style: {}, children: [
        {style: {padding: 10, alignSelf: 'stretch'}}
      ]},
      {width: 20, height: 20, top: 0, left: 0, children: [
        {width: 20, height: 20, top: 0, left: 0}
      ]}
    );
  });

  it('should layout node with inner & outer padding and stretch', function() {
    testLayout(
      {style: {padding: 50}, children: [
        {style: {padding: 10, alignSelf: 'stretch'}}
      ]},
      {width: 120, height: 120, top: 0, left: 0, children: [
        {width: 20, height: 20, top: 50, left: 50}
      ]}
    );
  });

  it('should layout node with stretch and child with margin', function() {
    testLayout(
      {style: {}, children: [
        {style: {alignSelf: 'stretch'}, children: [
          {style: {margin: 16}}
        ]}
      ]},
      {width: 32, height: 32, top: 0, left: 0, children: [
        {width: 32, height: 32, top: 0, left: 0, children: [
          {width: 0, height: 0, top: 16, left: 16}
        ]}
      ]}
    );
  });

  it('should layout node with top and left', function() {
    testLayout(
      {style: {top: 5, left: 5}},
      {width: 0, height: 0, top: 5, left: 5}
    );
  });

  it('should layout node with height, padding and space-around', function() {
    testLayout(
      {style : {height: 10, paddingTop: 5, justifyContent: 'space-around'}, children: [
        {style: {}}
      ]},
      {width: 0, height: 10, top: 0, left: 0, children: [
        {width: 0, height: 0, top: 7.5, left: 0}
      ]}
    );
  });

  it('should layout node with bottom', function() {
    testLayout(
      {style: {bottom: 5}},
      {width: 0, height: 0, top: -5, left: 0}
    );
  });

  it('should layout node with both top and bottom', function() {
    testLayout(
      {style: {top: 10, bottom: 5}},
      {width: 0, height: 0, top: 10, left: 0}
    );
  });

  it('should layout randomly', function() {
    function RNG(seed) {
      this.state = seed;
    }
    RNG.prototype.nextFloat = function() {
      // LCG using GCC's constants
      this.state = (1103515245 * this.state + 12345) % 0x80000000;
      return this.state / (0x80000000 - 1);
    }

    var rng = new RNG(0);
    function randMinMax(node, chance, attribute, min, max) {
      if (rng.nextFloat() < chance) {
        node.style[attribute] = Math.floor(rng.nextFloat() * (max - min)) + min;
      }
    }
    function randEnum(node, chance, attribute, enumValues) {
      if (rng.nextFloat() < chance) {
        node.style[attribute] = enumValues[Math.floor(rng.nextFloat() * enumValues.length)];
      }
    }
    function randChildren(node, chance) {
      while (rng.nextFloat() < chance) {
        if (!node.children) {
          node.children = [];
        }
        node.children.push(generateRandomNode());
      }
    }
    function randSpacing(node, chance, type, min, max) {
      randMinMax(node, chance, type, min, max);
      randMinMax(node, chance, type + 'Left', min, max);
      randMinMax(node, chance, type + 'Top', min, max);
      randMinMax(node, chance, type + 'Right', min, max);
      randMinMax(node, chance, type + 'Bottom', min, max);
    }
    function generateRandomNode() {
      var node = {style: {}};
      randMinMax(node, 0.1, 'width', 0, 1000);
      randMinMax(node, 0.1, 'height', 0, 1000);
      randMinMax(node, 0.1, 'top', -10, 10);
      randMinMax(node, 0.1, 'left', -10, 10);
      randMinMax(node, 0.1, 'right', -10, 10);
      randMinMax(node, 0.1, 'bottom', -10, 10);
      randSpacing(node, 0.1, 'margin', 0, 20);
      randSpacing(node, 0.1, 'padding', 0, 20);
      randEnum(node, 0.1, 'flexDirection', ['row', 'column']);
      randEnum(node, 0.1, 'justifyContent', ['flex-start', 'center', 'flex-end', 'space-between', 'space-around']);
      randEnum(node, 0.1, 'alignItems', ['flex-start', 'center', 'flex-end', 'stretch']);
      randEnum(node, 0.1, 'alignSelf', ['flex-start', 'center', 'flex-end', 'stretch']);
      randEnum(node, 0.1, 'flex', ['none', 1]);
      randChildren(node, 0.2);
      return node;
    }

    for (var i = 0; i < 1000; ++i) {
      var node = generateRandomNode();

      // The iframe's body has a natural width of 300 that it doesn't really make
      // to replicate in the test suite. The easiest workaround is not to test
      // alignSelf, position and flex properties on the root element.
      delete node.style.alignSelf;
      delete node.style.flex;
      delete node.style.position;

      expect({i: i, node: node, layout: computeLayout(node)})
        .toEqual({i: i, node: node, layout: computeDOMLayout(node)});
    }
  })

});
