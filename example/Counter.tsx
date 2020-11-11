import * as React from "react";
import { PuttableProps } from "../src/Document";

type CounterProps = PuttableProps & {
  /**
   * (Optional) Component's count, set this if you want to initialize a default.
   */
  count?: number;
};

/**
 * Counter application that tracks increment and decrement operations.
 */
export class Counter extends React.Component<CounterProps> {
  static defaultProps = {
    count: 0,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    putDocument: (state = {}): void => {
      // do nothing.
    },
  };

  /**
   * Update the count, either incrementing (true) or decrementing (false) it.
   * @param {boolean} increment True to increment, false to decrement.
   */
  private updateCount(increment: boolean): void {
    if (increment) {
      this.props.putDocument({ count: this.props.count + 1 });
    } else {
      this.props.putDocument({ count: this.props.count - 1 });
    }
  }

  private increment = (): void => {
    this.updateCount(true);
  };

  private decrement = (): void => {
    this.updateCount(false);
  };

  render(): React.ReactNode {
    return (
      <div>
        <p>
          Current count is:{" "}
          <span data-testid="current-count">{this.props.count}</span>
        </p>
        <button id="increment" onClick={this.increment}>
          Increment +
        </button>
        <button id="decrement" onClick={this.decrement}>
          Decrement -
        </button>
      </div>
    );
  }
}
