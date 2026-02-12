import { describe, it, expect } from 'vitest';
import {
  ACTION_CONFIGS,
  getActionConfig,
  canBlockAction,
} from './actionConfigs';

describe('Action Configurations', () => {
  describe('ACTION_CONFIGS', () => {
    it('should have configurations for all 7 actions', () => {
      expect(ACTION_CONFIGS).toHaveProperty('income');
      expect(ACTION_CONFIGS).toHaveProperty('foreign_aid');
      expect(ACTION_CONFIGS).toHaveProperty('coup');
      expect(ACTION_CONFIGS).toHaveProperty('tax');
      expect(ACTION_CONFIGS).toHaveProperty('assassinate');
      expect(ACTION_CONFIGS).toHaveProperty('steal');
      expect(ACTION_CONFIGS).toHaveProperty('exchange');
    });

    it('should configure income correctly', () => {
      const config = ACTION_CONFIGS.income;
      expect(config.canBeChallenged).toBe(false);
      expect(config.canBeBlocked).toBe(false);
      expect(config.cost).toBe(0);
      expect(config.requiresTarget).toBe(false);
    });

    it('should configure foreign_aid correctly', () => {
      const config = ACTION_CONFIGS.foreign_aid;
      expect(config.canBeChallenged).toBe(false);
      expect(config.canBeBlocked).toBe(true);
      expect(config.blockingCards).toEqual(['duke']);
      expect(config.cost).toBe(0);
      expect(config.requiresTarget).toBe(false);
    });

    it('should configure coup correctly', () => {
      const config = ACTION_CONFIGS.coup;
      expect(config.canBeChallenged).toBe(false);
      expect(config.canBeBlocked).toBe(false);
      expect(config.cost).toBe(7);
      expect(config.minCoinsForAction).toBe(7);
      expect(config.forcedAtCoins).toBe(10);
      expect(config.requiresTarget).toBe(true);
    });

    it('should configure tax correctly', () => {
      const config = ACTION_CONFIGS.tax;
      expect(config.canBeChallenged).toBe(true);
      expect(config.canBeBlocked).toBe(false);
      expect(config.card).toBe('duke');
      expect(config.cost).toBe(0);
      expect(config.requiresTarget).toBe(false);
    });

    it('should configure assassinate correctly', () => {
      const config = ACTION_CONFIGS.assassinate;
      expect(config.canBeChallenged).toBe(true);
      expect(config.canBeBlocked).toBe(true);
      expect(config.blockingCards).toEqual(['contessa']);
      expect(config.card).toBe('assassin');
      expect(config.cost).toBe(3);
      expect(config.minCoinsForAction).toBe(3);
      expect(config.requiresTarget).toBe(true);
    });

    it('should configure steal correctly', () => {
      const config = ACTION_CONFIGS.steal;
      expect(config.canBeChallenged).toBe(true);
      expect(config.canBeBlocked).toBe(true);
      expect(config.blockingCards).toEqual(['captain', 'ambassador']);
      expect(config.card).toBe('captain');
      expect(config.cost).toBe(0);
      expect(config.requiresTarget).toBe(true);
    });

    it('should configure exchange correctly', () => {
      const config = ACTION_CONFIGS.exchange;
      expect(config.canBeChallenged).toBe(true);
      expect(config.canBeBlocked).toBe(false);
      expect(config.card).toBe('ambassador');
      expect(config.cost).toBe(0);
      expect(config.requiresTarget).toBe(false);
    });
  });

  describe('getActionConfig', () => {
    it('should return configuration for any action', () => {
      const config = getActionConfig('tax');
      expect(config).toBeDefined();
      expect(config.card).toBe('duke');
    });
  });

  describe('canBlockAction', () => {
    it('should allow Duke to block foreign_aid', () => {
      expect(canBlockAction('foreign_aid', 'duke')).toBe(true);
    });

    it('should not allow Contessa to block foreign_aid', () => {
      expect(canBlockAction('foreign_aid', 'contessa')).toBe(false);
    });

    it('should allow Contessa to block assassinate', () => {
      expect(canBlockAction('assassinate', 'contessa')).toBe(true);
    });

    it('should allow Captain to block steal', () => {
      expect(canBlockAction('steal', 'captain')).toBe(true);
    });

    it('should allow Ambassador to block steal', () => {
      expect(canBlockAction('steal', 'ambassador')).toBe(true);
    });

    it('should not allow Duke to block steal', () => {
      expect(canBlockAction('steal', 'duke')).toBe(false);
    });

    it('should not allow blocking income', () => {
      expect(canBlockAction('income', 'duke')).toBe(false);
    });

    it('should not allow blocking coup', () => {
      expect(canBlockAction('coup', 'contessa')).toBe(false);
    });
  });
});
