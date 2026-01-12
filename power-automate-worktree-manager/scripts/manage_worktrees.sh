#!/bin/bash
# Merge and cleanup worktrees after parallel development

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to list all worktrees
list_worktrees() {
    print_header "Git Worktrees"
    git worktree list
}

# Function to merge a specific worktree
merge_worktree() {
    local branch_name=$1
    local target_branch=${2:-main}
    
    print_header "Merging $branch_name into $target_branch"
    
    # Make sure we're on the target branch
    git checkout "$target_branch" || {
        print_error "Failed to checkout $target_branch"
        return 1
    }
    
    # Pull latest changes
    echo "Pulling latest changes from remote..."
    git pull || print_warning "Could not pull from remote (working offline?)"
    
    # Merge the branch
    echo "Merging $branch_name..."
    if git merge "$branch_name" --no-ff -m "Merge $branch_name"; then
        print_success "Successfully merged $branch_name"
        
        # Ask if user wants to push
        read -p "Push changes to remote? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git push && print_success "Pushed to remote"
        fi
        
        return 0
    else
        print_error "Merge conflicts detected!"
        echo "Please resolve conflicts manually, then run:"
        echo "  git commit"
        echo "  git push (if desired)"
        return 1
    fi
}

# Function to remove a worktree
remove_worktree() {
    local worktree_path=$1
    local branch_name=$2
    local force=${3:-false}
    
    print_header "Removing Worktree: $worktree_path"
    
    # Remove the worktree
    if [ "$force" = "true" ]; then
        git worktree remove "$worktree_path" --force && print_success "Worktree removed (forced)"
    else
        if git worktree remove "$worktree_path"; then
            print_success "Worktree removed"
        else
            print_error "Failed to remove worktree (may have uncommitted changes)"
            read -p "Force remove? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git worktree remove "$worktree_path" --force && print_success "Worktree removed (forced)"
            else
                return 1
            fi
        fi
    fi
    
    # Ask about deleting the branch
    if [ -n "$branch_name" ]; then
        read -p "Delete branch $branch_name? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git branch -d "$branch_name" 2>/dev/null && print_success "Branch deleted" || {
                print_warning "Could not delete branch (may have unmerged changes)"
                read -p "Force delete branch? (y/n) " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    git branch -D "$branch_name" && print_success "Branch deleted (forced)"
                fi
            }
        fi
    fi
}

# Function to cleanup all worktrees except main
cleanup_all() {
    local target_branch=${1:-main}
    
    print_header "Cleanup All Worktrees"
    print_warning "This will remove all worktrees except the main one"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled"
        return 0
    fi
    
    # Get all worktrees except the main one
    local worktrees=$(git worktree list --porcelain | grep "^worktree" | awk '{print $2}' | tail -n +2)
    
    for wt in $worktrees; do
        # Get branch name for this worktree
        local branch=$(git worktree list --porcelain | grep -A 2 "^worktree $wt$" | grep "^branch" | awk -F/ '{print $NF}')
        remove_worktree "$wt" "$branch"
        echo ""
    done
    
    print_success "Cleanup complete"
}

# Function to show worktree status
worktree_status() {
    print_header "Worktree Status"
    
    # Get all worktrees
    local worktrees=$(git worktree list --porcelain | grep "^worktree" | awk '{print $2}')
    
    for wt in $worktrees; do
        if [ -d "$wt" ]; then
            echo ""
            echo -e "${YELLOW}Worktree: $wt${NC}"
            
            # Get branch name
            local branch=$(git worktree list --porcelain | grep -A 2 "^worktree $wt$" | grep "^branch" | awk -F/ '{print $NF}')
            echo "Branch: $branch"
            
            # Check git status
            pushd "$wt" > /dev/null
            local status=$(git status --short)
            if [ -z "$status" ]; then
                print_success "Clean working directory"
            else
                print_warning "Uncommitted changes:"
                echo "$status"
            fi
            popd > /dev/null
        fi
    done
}

# Main menu
show_menu() {
    echo ""
    print_header "Power Automate Worktree Manager"
    echo "1. List all worktrees"
    echo "2. Show worktree status"
    echo "3. Merge a specific worktree"
    echo "4. Remove a specific worktree"
    echo "5. Cleanup all worktrees (except main)"
    echo "6. Exit"
    echo ""
    read -p "Select an option (1-6): " choice
    
    case $choice in
        1)
            list_worktrees
            read -p "Press enter to continue..."
            show_menu
            ;;
        2)
            worktree_status
            read -p "Press enter to continue..."
            show_menu
            ;;
        3)
            read -p "Enter branch name to merge: " branch
            read -p "Enter target branch (default: main): " target
            target=${target:-main}
            merge_worktree "$branch" "$target"
            read -p "Press enter to continue..."
            show_menu
            ;;
        4)
            read -p "Enter worktree path to remove: " path
            read -p "Enter branch name (optional): " branch
            remove_worktree "$path" "$branch"
            read -p "Press enter to continue..."
            show_menu
            ;;
        5)
            read -p "Enter base branch (default: main): " target
            target=${target:-main}
            cleanup_all "$target"
            read -p "Press enter to continue..."
            show_menu
            ;;
        6)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid option"
            show_menu
            ;;
    esac
}

# Parse command line arguments
if [ $# -eq 0 ]; then
    show_menu
else
    case $1 in
        list)
            list_worktrees
            ;;
        status)
            worktree_status
            ;;
        merge)
            merge_worktree "$2" "${3:-main}"
            ;;
        remove)
            remove_worktree "$2" "$3"
            ;;
        cleanup)
            cleanup_all "${2:-main}"
            ;;
        *)
            echo "Usage: $0 [list|status|merge|remove|cleanup]"
            echo ""
            echo "Commands:"
            echo "  list                  - List all worktrees"
            echo "  status                - Show status of all worktrees"
            echo "  merge <branch> [target] - Merge branch into target (default: main)"
            echo "  remove <path> [branch] - Remove worktree and optionally delete branch"
            echo "  cleanup [target]      - Remove all worktrees except main"
            echo ""
            echo "Run without arguments for interactive menu"
            exit 1
            ;;
    esac
fi
